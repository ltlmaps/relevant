const queue = require('queue');
const pagerank = require('../utils/pagerank').default;
const Invest = require('../api/invest/invest.model');
const CommunityMember = require('../api/community/community.member.model').default;
const Post = require('../api/post/post.model');
const PostData = require('../api/post/postData.model');
const Relevance = require('../api/relevance/relevance.model');
const { RELEVANCE_DECAY, REP_CUTOFF } = require('../config/globalConstants');
const Community = require('../api/community/community.model').default;

const q = queue({ concurrency: 10 });

/* eslint no-console: 0 */

// compute relevance using pagerank
export default async function computePageRank(params) {
  const { author, post, debug, communityId, community, fast } = params;

  if (!community) throw new Error('missing community name');

  let { heapUsed } = process.memoryUsage();
  let mb = Math.round((100 * heapUsed) / 1048576) / 100;
  debug && console.log('Init PR is using ' + mb + 'MB of Heap.');
  // let users = await User.find({})
  // .populate({ path: 'relevance', match: { communityId, global: true } });

  const now = new Date();

  const admins = await CommunityMember.find({ role: 'admin', communityId }).populate({
    path: 'user',
    select: 'relevance',
    populate: {
      path: 'relevance',
      match: { communityId, global: true },
      select: 'pagerank pagerankRaw relevance'
    }
  });

  const rankedNodes = {};
  const negativeWeights = {};
  const originalRelevance = {};
  const originalUsers = {};
  const originalPosts = {};
  const rankedPosts = {};
  const nstart = {};

  // only look at votes up to a REP_CUTOFF years ago
  const timeLimit = new Date().setFullYear(new Date().getFullYear() - REP_CUTOFF);

  const votes = await Invest.find({
    communityId,
    createdAt: { $gt: timeLimit },
    ownPost: { $ne: true },
    investor: { $exists: true }
  })
    .populate({
      path: 'investor',
      select: 'relevance handle',
      populate: {
        path: 'relevance',
        match: { communityId, global: true },
        select: 'pagerank pagerankRaw relevance'
      }
    })
    .populate({
      path: 'author',
      select: 'relevance handle',
      populate: {
        path: 'relevance',
        match: { communityId, global: true },
        select: 'pagerank pagerankRaw relevance'
      }
    })
    .populate({
      path: 'post',
      select: 'data title',
      options: { select: 'data body' },
      populate: {
        path: 'data',
        select: 'pagerank relevance pagerankRaw body'
      }
    });

  votes.forEach(vote => {
    const user = vote.investor;
    if (!user) return null;
    const postAuthor = vote.author;
    const { post: postObj } = vote;

    const postId = postObj
      ? vote.amount < 0
        ? postObj._id + '__neg'
        : postObj._id
      : null;

    if (postObj && !originalPosts[postId]) {
      originalPosts[postId] = postObj._id;
    }
    if (postAuthor && !originalUsers[postAuthor._id]) {
      originalUsers[postAuthor._id] = postAuthor;
      originalRelevance[postAuthor._id] = postAuthor.relevance
        ? postAuthor.relevance.relevance
        : 0;
    }
    return processUpvote({
      rankedNodes,
      rankedPosts,
      nstart,
      upvote: vote,
      user,
      now
    });
  });

  const personalization = {};
  admins.forEach(a => {
    if (!a.user) return;
    const userId = a.user._id;
    if (!originalUsers[userId]) originalUsers[userId] = a.user;
    if (!rankedNodes[userId]) rankedNodes[userId] = {};
    personalization[userId] = 1;
    if (!nstart[userId]) {
      nstart[userId] = a.user.relevance ? Math.max(a.user.relevance.pagerankRaw, 0) : 0;
    }
    if (!rankedNodes[userId]) {
      rankedNodes[userId] = {};
    }
  });

  // TODO prune users with no votes
  Object.keys(rankedNodes).forEach(u => {
    if (!originalUsers[u] && !originalPosts[u]) {
      return delete rankedNodes[u];
    }
    return Object.keys(rankedNodes[u]).forEach(name => {
      // fills any missing names in list
      if (!rankedNodes[name]) {
        if (!originalUsers[name]) {
          delete rankedNodes[u][name];
        } else {
          const user = originalUsers[name];
          nstart[name] = user.relevance ? Math.max(user.relevance.pagerankRaw, 0) : 0;
          rankedNodes[name] = {};
        }
      }
    });
  });

  heapUsed = process.memoryUsage().heapUsed;
  mb = Math.round((100 * heapUsed) / 1048576) / 100;
  debug && console.log('Before PR - using ' + mb + 'MB of Heap.');

  debug && console.log('user query time ', (new Date().getTime() - now) / 1000 + 's');

  const scores = pagerank(rankedNodes, {
    alpha: 0.85,
    users: originalUsers,
    personalization,
    negativeWeights,
    nstart,
    fast,
    debug
  });

  heapUsed = process.memoryUsage().heapUsed;
  mb = Math.round((100 * heapUsed) / 1048576) / 100;
  debug && console.log('After PR is using ' + mb + 'MB of Heap.');

  let max = 0;
  let secondMax = 0;
  const min = 0;
  let maxPost = 0;
  const minPost = 0;

  let array = [];
  Object.keys(scores).forEach(id => {
    let postNode;
    if (rankedPosts[id]) {
      postNode = rankedPosts[id];
    }

    const u = scores[id] || 0;
    if (postNode) maxPost = Math.max(u.rank, maxPost);
    else {
      secondMax = Math.max(secondMax, Math.min(u.rank, max));
      max = Math.max(u.rank, max);
    }

    array.push({
      id,
      rank: u.rank,
      relevance: postNode ? postNode.data.relevance : originalRelevance[id],
      type: postNode ? 'post' : 'user',
      title: postNode ? postNode.title : null,
      handle: rankedNodes[id].handle,
      degree: u.degree
    });
  });

  const N = array.length;

  await Community.findOneAndUpdate(
    { _id: communityId },
    { maxPostRank: maxPost || 50, maxUserRank: secondMax || 50, numberOfElements: N }
  );

  array = mergeNegativeNodes(array);

  const maxRel = array.reduce((p, n) => Math.max(p, n.relevance || 0), 0);
  array = array.sort((a, b) => a.rank - b.rank);

  if (author) {
    let u = array.find(el => el.id.toString() === author._id.toString());
    u = await updateItemRank({
      min,
      max,
      secondMax,
      minPost,
      maxPost,
      u,
      N,
      debug,
      communityId,
      community,
      maxRel
    });
    author.relevance.pagerank = u.pagerank;
  }

  if (post) {
    let u = array.find(el => el.id.toString() === post._id.toString());
    if (!u) u = { id: post._id, rank: 0, relevance: 0, type: 'post' };
    u = await updateItemRank({
      min,
      max,
      minPost,
      maxPost,
      u,
      N,
      debug,
      communityId,
      community,
      maxRel
    });
    post.data.pagerank = u.pagerank;
    post.pagerank = u.pagerank;
  }

  array.forEach(async u => {
    q.push(async cb => {
      await updateItemRank({
        min,
        max,
        secondMax,
        minPost,
        maxPost,
        u,
        N,
        debug,
        communityId,
        community,
        maxRel
      });

      cb();
    });
  });

  return new Promise((resolve, reject) =>
    q.start(err => {
      if (err) reject(err);
      resolve({ author, post });
    })
  );

  // if (author || post) {
  //   return { author, post };
  // }
  // updatedUsers = await Promise.all(updatedUsers);
  // console.log(updatedUsers);
}

function mergeNegativeNodes(array) {
  const newArray = [];
  array.forEach(node => {
    if (node.id.match('__neg')) return null;
    const negativeNode = array.find(
      n => n.id.match('__neg') && n.id.replace('__neg', '') === node.id
    );
    node.rankNeg = negativeNode ? negativeNode.rank : 0;
    return newArray.push(node);
  });
  return newArray;
}

async function updateItemRank(props) {
  const { secondMax, maxPost, u, N, debug, communityId, community, maxRel } = props;
  let { min, minPost } = props;
  min = 0;
  minPost = 0;
  let rank =
    Math.min(
      99,
      (100 * Math.log(N * (u.rank - min) + 1)) / Math.log(N * (secondMax - min) + 1)
    ) || 0;

  const postRank =
    (100 * Math.log(N * (u.rank - minPost) + 1)) /
      Math.log(N * (maxPost - minPost) + 1) || 0;

  const postRankNeg =
    (100 * Math.log(N * (u.rankNeg - minPost) + 1)) /
      Math.log(N * (maxPost - minPost) + 1) || 0;

  if (u.type === 'post') {
    rank = postRank - postRankNeg;
  }

  rank = rank.toFixed(2);
  const rel = u.relevance;

  if (debug) {
    // if (debug && u.type !== 'post') {
    console.log('name: ', u.handle || u.title || u.id);
    console.log('PageRank ', rank, 'rel:', Math.round((100 * rel) / maxRel));
    console.log('-----');
  }

  if (u.type === 'user') {
    if (Number.isNaN(rank)) return null;

    const user = await CommunityMember.findOneAndUpdate(
      { user: u.id, communityId },
      { reputation: rank, degree: u.degree, pagerank: rank, pagerankRaw: u.rank },
      {
        // new: true,
        upsert: true
      }
    );

    await Relevance.findOneAndUpdate(
      { user: u.id, communityId, global: true },
      { pagerank: rank, pagerankRaw: u.rank, community },
      {
        new: true,
        upsert: true,
        fields: 'pagerank pagerankRaw user rank relevance communityId community'
      }
    );
    return user;
  }
  if (u.type === 'post') {
    if (Number.isNaN(rank)) {
      return null;
    }
    let post = await Post.findOneAndUpdate(
      { _id: u.id },
      { pagerank: rank },
      {
        new: true,
        fields: 'pagerank title rank relevance parentPost communityId'
      }
    );
    const postData = await PostData.findOneAndUpdate(
      { post: u.id, communityId },
      { pagerank: rank, pagerankRaw: u.rank, pagerankRawNeg: u.rankNeg },
      {
        new: true,
        fields:
          'pagerank pagerankRaw pagerankRawNeg post rank relevance postDate communityId'
      }
    );

    if (postData && postData.needsRankUpdate) {
      postData.needsRankUpdate = false;
      post.data = postData;
      post = await post.updateRank({ communityId });
      // console.log(post.toObject());
      // console.log(post.url, post.title, post.pagerank, post.rank);
    }

    return post.data || postData;
  }
  return null;
}

function processUpvote(params) {
  const { rankedNodes, rankedPosts, nstart, upvote, user, now } = params;
  const { post, author, amount } = upvote;
  const authorId = author ? author._id : null;
  const userId = user._id;
  // TODO in query
  // if (ownPost) return;
  // same as OWN?
  // if (authorId && authorId === userId) return;

  // TODO once we track twitter users this won't be an issue
  // this is to make sure we rank twitter posts upvoted by users
  // if (!upvote.author) return;

  let a = amount;
  if (!a) a = 0;

  // time discount (RELEVANCE_DECAY month half-life)
  const t = now.getTime() - upvote.createdAt.getTime();
  a *= (1 / 2) ** (t / RELEVANCE_DECAY);

  if (!rankedNodes[userId]) {
    nstart[userId] = user.relevance ? Math.max(user.relevance.pagerankRaw, 0) : 0;
    rankedNodes[userId] = {};
  }

  if (authorId && !rankedNodes[userId][authorId]) {
    rankedNodes[userId][authorId] = {
      weight: 0,
      negative: 0,
      total: 0,
      handle: author.handle
    };
  }

  if (a < 0) {
    const downvote = true;
    const postId = createPostNode({
      post,
      rankedNodes,
      rankedPosts,
      nstart,
      user,
      downvote
    });

    if (authorId) rankedNodes[userId][authorId].negative += -a;
    // here we use a different node to track post downvotes
    if (post) {
      rankedNodes[userId][postId].weight += -a;
      rankedNodes[userId][postId].total += -a;
    }
  } else {
    if (authorId) rankedNodes[userId][authorId].weight += a;
    const postId = createPostNode({ post, rankedNodes, rankedPosts, nstart, user });
    if (post) {
      rankedNodes[userId][postId].weight += a;
      rankedNodes[userId][postId].total += Math.abs(a);
    }
  }
  if (authorId) rankedNodes[userId][authorId].total += Math.abs(a);
  // here total shouldn't really matter
}

function createPostNode({ post, rankedNodes, nstart, user, rankedPosts, downvote }) {
  if (!post) return null;
  const { _id, data, title } = post;
  const postId = downvote ? _id + '__neg' : _id;
  rankedNodes[postId] = rankedNodes[postId] || {};
  rankedPosts[postId] = rankedPosts[postId] || post;
  if (!rankedNodes[user._id][postId]) {
    rankedNodes[user._id][postId] = {
      weight: 0,
      negative: 0,
      total: 0,
      title
    };
  }
  nstart[postId] = data
    ? Math.max(downvote ? data.pagerankRawNeg : data.pagerankRaw, 0)
    : 0;
  return postId;
}

export async function computeApproxPageRank({
  author,
  post,
  user,
  communityId,
  vote,
  undoInvest
}) {
  try {
    const com = await Community.findOne(
      { _id: communityId },
      'maxUserRank maxPostRank numberOfElements'
    );
    const member = await CommunityMember.findOne({ communityId, user: user._id });

    let amount;
    if (vote) amount = vote.amount;
    const N = com.numberOfElements;
    const { maxUserRank, maxPostRank } = com;

    // if user relevance object doesn't exist, there is nothing to update
    if (!user.relevance || user.relevance.pagerankRaw <= 0) return { author, post };

    const userR = user.relevance ? user.relevance.pagerankRaw : 0;
    const authorId = author ? author._id : null;

    if (author && !author.relevance) {
      author.relevance = await Relevance.findOne({
        user: author._id,
        communityId,
        global: true
      });
    }

    // Need a way to 0 out post votes and user votes
    let postVotes = true;
    let userVotes = true;
    if (undoInvest) {
      postVotes = await Invest.countDocuments({ post: post._id, ownPost: false });
      if (!postVotes && post) {
        post.data.pagerank = 0;
        post.data.pagerankRaw = 0;
        post.data.pagerankRawNeg = 0;
        await post.data.save();
      }
      userVotes = await Invest.countDocuments({ author: authorId, ownPost: false });
      if (!userVotes && author) {
        author.relevance.pagerank = 0;
        author.relevance.pagerankRaw = 0;
        await author.relevance.save();
      }
      if (!postVotes && !userVotes) {
        return { author, post };
      }
    }

    const degree = member.degree || 1;

    const a = Math.abs(amount);
    const increment = (a / degree) * userR;
    const uDownvoteInc = increment / 3;

    if (amount >= 0) {
      if (undoInvest) {
        if (author && userVotes) author.relevance.pagerankRaw -= increment;
        if (post && postVotes) post.data.pagerankRaw -= increment;
      } else {
        if (author) author.relevance.pagerankRaw += increment;
        if (post) post.data.pagerankRaw += increment;
      }
    } else if (amount < 0) {
      if (undoInvest) {
        if (author && userVotes) {
          author.relevance.pagerankRaw += uDownvoteInc;
        }
        if (post && postVotes) post.data.pagerankRawNeg -= increment;
      } else {
        if (author) author.relevance.pagerankRaw -= uDownvoteInc;
        if (post) post.data.pagerankRawNeg += increment;
      }
    }

    if (author) {
      const rA = author ? Math.max(author.relevance.pagerankRaw, 0) : 0;
      author.relevance.pagerank = Math.min(
        99,
        (100 * Math.log(N * rA + 1)) / Math.log(N * maxUserRank + 1)
      );
    }

    if (post) {
      const pRank = Math.max(post.data.pagerankRaw, 0);
      const pRankNeg = Math.max(post.data.pagerankRawNeg || 0, 0);

      const normRank = Math.min(
        100,
        (100 * Math.log(N * pRank + 1)) / Math.log(N * maxPostRank + 1)
      );
      const normRankNeg = Math.min(
        100,
        (100 * Math.log(N * pRankNeg + 1)) / Math.log(N * maxPostRank + 1)
      );

      post.data.pagerank = normRank - normRankNeg;
    }

    await Promise.all([
      post ? post.data.save() : null,
      author ? author.relevance.save() : null
    ]);

    return { author, post };
  } catch (err) {
    console.log('page rank approx error ', err);
    return null;
  }
}
