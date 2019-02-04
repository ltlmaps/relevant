import { EventEmitter } from 'events';
import MetaPost from './link.model';
import User from '../user/user.model';
import Notification from '../notification/notification.model';
import Invest from '../invest/invest.model';

const mongoose = require('mongoose');

const PostSchemaEvents = new EventEmitter();
const { Schema } = mongoose;
const apnData = require('../../pushNotifications');

const TENTH_LIFE = 3 * 24 * 60 * 60 * 1000;

const PostSchema = new Schema(
  {
    body: String,
    title: String,
    community: String,
    communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
    tags: [{ type: String, ref: 'Tag' }],
    category: { type: String, ref: 'Tag' },
    repost: {
      post: { type: Schema.Types.ObjectId, ref: 'Post' },
      comment: { type: Schema.Types.ObjectId, ref: 'Post' },
      commentBody: String
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    embeddedUser: {
      _id: String,
      handle: String,
      name: String,
      image: String
    },

    flagged: { type: Boolean, default: false },
    flaggedBy: [{ type: String, ref: 'User', select: false }],
    flaggedTime: Date,
    mentions: [{ type: String, ref: 'User' }],

    // store link info here
    metaPost: { type: Schema.Types.ObjectId, ref: 'MetaPost' },
    url: { type: String, unique: false },

    // TEMP Deprecate remove after migrate 0.20
    link: { type: String, unique: false },

    // Should be array of links used instead of metaPost
    // TODO: Implement this
    links: [
      {
        text: String,
        href: String,
        position: Number,
        metaPost: { type: Schema.Types.ObjectId, ref: 'MetaPost' }
      }
    ],

    // aboutLink: { type: Schema.Types.ObjectId, ref: 'Post' },
    linkParent: { type: Schema.Types.ObjectId, ref: 'Post' },
    // top-level comments have parent
    parentPost: { type: Schema.Types.ObjectId, ref: 'Post' },
    // replies have parent comment
    parentComment: { type: Schema.Types.ObjectId, ref: 'Post' },

    postDate: { type: Date, index: true },
    latestComment: { type: Date, index: true },
    commentCount: { type: Number, default: 0 },

    // todo should be diff table - diff communities will have diff payouts

    rank: { type: Number, default: 0 },
    relevance: { type: Number, default: 0 },
    pagerank: { type: Number, default: 0 },
    upVotes: { type: Number, default: 0 },
    downVotes: { type: Number, default: 0 },

    paidOut: { type: Boolean, default: false },
    payoutTime: { type: Date },

    // TODO twitter stuff should go into data model
    twitter: { type: Boolean, default: false },
    // Use this to hide twitter posts
    // TODO this should also go into a data model
    // and data should be used to query community feed
    hidden: { type: Boolean, default: false },
    twitterUser: Number,
    twitterId: Number,
    twitterScore: { type: Number, default: 0 },
    // feedRelevance: Number,
    twitterUrl: String,
    seenInFeedNumber: { type: Number, default: 0 },

    // link, comment, repost, post
    type: { type: String, default: 'post' },

    version: { type: String, default: 'metaRework' }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

PostSchema.virtual('reposted', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'repost.post'
});

PostSchema.virtual('commentary', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'linkParent'
});

PostSchema.virtual('embeddedUser.relevance', {
  ref: 'Relevance',
  localField: 'user',
  foreignField: 'user',
  justOne: true
});

PostSchema.virtual('data', {
  ref: 'PostData',
  localField: '_id',
  foreignField: 'post',
  justOne: true
});

PostSchema.virtual('children', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'parentPost',
  justOne: false
});

PostSchema.index({ twitter: 1 });
PostSchema.index({ parentPost: 1, hidden: 1 });
PostSchema.index({ twitter: 1, twitterId: 1 });

PostSchema.index({ rank: 1 });
PostSchema.index({ postDate: 1 });
PostSchema.index({ _id: 1, user: 1 });
PostSchema.index({ _id: 1, community: 1, user: 1 });
PostSchema.index({ postDate: 1, tags: 1 });
PostSchema.index({ rank: 1, tags: 1 });
PostSchema.index({ paidOut: 1, payoutTime: 1 });

PostSchema.pre('save', async function save(next) {
  try {
    const countQuery = { parentPost: this._id, hidden: false };
    this.commentCount = await this.model('Post').count(countQuery);
    return next();
  } catch (err) {
    console.log('error updating post count', err) // eslint-disable-line
    return next();
  }
});

PostSchema.methods.addPostData = async function addPostData(community) {
  const eligibleForReward = !this.parentPost && !this.twitter;

  const data = new (this.model('PostData'))({
    eligibleForReward,
    hidden: this.hidden,
    type: this.type,
    parentPost: this.parentPost,
    postDate: this.postDate || this.createdAt,
    payoutTime: this.payoutTime,
    post: this._id,
    community: community ? community.slug : this.community,
    communityId: community ? community._id : this.communityId,
    relevance: this.relevance,
    rank: this.rank,
    relevanceNeg: this.relevanceNeg,
    latestComment: this.latestComment || this.postDate,
  });

  await data.save();
  this.data = data;
  return this;
};

PostSchema.statics.events = PostSchemaEvents;

PostSchema.methods.updateClient = function updateClient(user) {
  if (this.user && this.user._id) this.user = this.user._id;
  const postNote = {
    _id: user ? user._id : null,
    type: 'UPDATE_POST',
    payload: this
  };
  this.model('Post').events.emit('postEvent', postNote);
};

PostSchema.methods.addUserInfo = async function addUserInfo(user) {
  try {
    this.embeddedUser = {
      id: user._id,
      _id: user._id,
      handle: user.handle,
      name: user.name,
      image: user.image
    };

    return this;
  } catch (err) {
    throw new Error(err);
  }
};

async function updateLatestComment({ post, communityId }) {
  if (post.parentPost) return post;

  const latestComment = await post.model('PostData')
  .findOne({ parentPost: post._id, communityId, hidden: false, type: 'post' }, 'postDate')
  .sort({ postDate: -1 });

  if (!latestComment) return post;

  post.data.latestComment = latestComment.postDate;
  post.latestComment = latestComment.postDate;

  return post;
}

// TODO work on this
PostSchema.methods.updateRank = async function updateRank({ communityId, updateTime }) {
  try {
    let post = this;
    if (!post.data) {
      post.data = await post.model('PostData').findOne({ post: post._id, communityId });
    }
    const { pagerank } = post.data;

    if (updateTime && !post.parentPost) post = await updateLatestComment({ post, communityId });

    // Don't use latestComment to compute post rank!
    if (!post.data.postDate) post = await post.addPostData();
    const { postDate } = post.data;

    let rank = postDate.getTime() / TENTH_LIFE + Math.log10(pagerank + 1);
    rank = Math.round(rank * 1000) / 1000;

    // But if a comment ranks highly - update post rank
    const topComment = await post.model('PostData')
    .findOne({ parentPost: post._id, communityId }, 'rank')
    .sort({ rank: -1 });

    if (topComment) rank = Math.max(rank, topComment.rank);

    post.data.rank = rank;

    // TODO - deprecate this once we don't use this in the feed
    post.rank = rank;
    if (post.communityId === communityId) {
      post.pagerank = post.data.pagerank;
    }

    await post.data.save();
    await post.save();
    return post;
  } catch (err) {
    throw new Error(err);
  }
};

PostSchema.statics.newLinkPost = async function newLinkPost({ linkObject, postObject }) {
  try {
    const { tags, postDate, payoutTime, hidden, url, communityId, community } = postObject;

    let post = await this.model('Post')
    .findOne({ url, type: 'link' })
    .populate({ path: 'data', match: { communityId } });

    if (!post) {
      const parentObj = {
        url,
        tags,
        postDate,
        payoutTime,
        hidden,
        type: 'link',
        latestComment: postDate,
      };
      post = await new (this.model('Post'))(parentObj);
    }

    if (!post.data) {
      post = await post.addPostData({
        slug: community, _id: communityId
      });
    }

    // TODO figure out what to do with payoutTime should old post reset?
    // for now we don't update payout time
    if (!hidden && post.latestComment < postDate) {
      post.latestComment = postDate;
      post.data.latestComment = postDate;
    }

    if (!hidden) await post.updateRank({ communityId });

    post = await post.upsertMetaPost(post.metaPost, linkObject);
    post.data = await post.data.save();
    post = await post.save();

    return post;
  } catch (err) {
    throw new Error(err);
  }
};


PostSchema.methods.upsertLinkParent = async function upsertLinkParent(linkObject) {
  try {
    const post = this;

    const parent = await this.model('Post').newLinkPost({ postObject: post, linkObject });
    parent.commentCount++;

    post.linkParent = parent;
    post.parentPost = parent;
    if (post.data) post.data.parentPost = parent;
    post.metaPost = parent.metaPost;

    return post;
  } catch (err) {
    throw new Error(err);
  }
};

PostSchema.methods.insertIntoFeed = async function insertIntoFeed(communityId) {
  try {
    const post = this;
    if (post.parentPost) throw new Error('Child comments don\'t go in the feed');

    await this.model('PostData').findOneAndUpdate(
      { post: post._id, communityId },
      { isInFeed: true }
    );

    const newPostEvent = {
      type: 'SET_NEW_POSTS_STATUS',
      payload: { communityId }
    };
    this.model('Post').events.emit('postEvent', newPostEvent);
    return post;
  } catch (err) {
    return console.log('insertIntoFeed error', err); // eslint-disable-line
  }
};


PostSchema.methods.upsertMetaPost = async function upsertMetaPost(metaId, linkObject) {
  try {
    let meta;
    if (metaId) {
      const _id = metaId.id || metaId;
      if (typeof _id === 'string') meta = await MetaPost.findOne({ _id });
    }
    const url = linkObject.url || this.url || this.link;
    if (url && !meta) meta = await MetaPost.findOne({ url });

    if (!meta) meta = new MetaPost();
    meta.set(linkObject);
    meta = await meta.save();

    this.metaPost = meta;
    return this.save();
  } catch (err) {
    return console.log('upsertMetaPost error', err); // eslint-disable-line
  }
};

PostSchema.statics.sendOutInvestInfo = async function sendOutInvestInfo(postIds, userId) {
  try {
    const investments = await Invest.find({ investor: userId, post: { $in: postIds } });
    const updatePosts = {
      _id: userId,
      type: 'UPDATE_POST_INVESTMENTS',
      payload: investments
    };
    this.events.emit('postEvent', updatePosts);
  } catch (err) {
    console.log('sendOutInvestInfo error', err); // eslint-disable-line
  }
};

PostSchema.statics.sendOutMentions = async function sendOutMentions(
  mentions,
  post,
  mUser,
  comment
) {
  try {
    let textParent = comment || post;
    const promises = mentions.map(async mention => {
      try {
        const type = comment ? 'comment' : 'post';

        mUser = await User.findOne(
          { _id: mUser._id || mUser },
          'blockedBy blocked name role'
        );

        const blocked =
          mUser.blockedBy.find(u => u === mention) ||
          mUser.blocked.find(u => u === mention);

        if (blocked) textParent.mentions = textParent.mentions.filter(m => m !== blocked);

        let query = { handle: mention };

        let group;
        if (mention === 'everyone') {
          if (mUser.role !== 'admin') return null;
          query = {}; // TODO should this this as community
          group = ['everyone'];
        }

        const users = await User.find(query, 'deviceTokens');

        users.forEach(user => {
          let alert = (mUser.name || mUser) + ' mentioned you in a ' + type;
          if (mention === 'everyone' && post.body) alert = post.body;
          const payload = { 'Mention from': textParent.embeddedUser.name };
          apnData.sendNotification(user, alert, payload);
        });

        const dbNotificationObj = {
          post: post._id,
          forUser: users._id,
          group,
          byUser: mUser._id || mUser,
          amount: null,
          type: type + 'Mention',
          personal: true,
          read: false
        };

        const newDbNotification = new Notification(dbNotificationObj);
        const note = await newDbNotification.save();

        const newNotifObj = {
          _id: group ? null : mention,
          type: 'ADD_ACTIVITY',
          payload: note
        };

        this.events.emit('postEvent', newNotifObj);
        return null;
      } catch (err) {
        throw new Error(err);
      }
    });

    await Promise.all(promises);
    textParent = await textParent.save();
    textParent.updateClient();
    return textParent;
  } catch (err) {
    return console.log('sendOutMentions error', err); // eslint-disable-line
  }
};

// pruneFeed (only for link posts)
PostSchema.methods.pruneFeed = async function pruneFeed({ communityId }) {
  try {
    const post = this;

    post.data = await this.model('PostData').findOne({ post: post._id, communityId });
    const { shares } = post.data;

    if (post.type !== 'link') throw new Error('Should not prune anything but links');
    if (!communityId) throw new Error('missing community');

    // Thread has no children - remove everything
    const children = await this.model('Post').count({ parentPost: post._id });

    // there is no way to remove post link
    // maybe we shouldn't 'invest in links automatically'?
    if (!children && !shares) {
      await post.remove();
      return null;
    }

    const communityChildren = await this.model('Post').count({
      communityId,
      parentPost: post._id,
    });

    if (communityChildren || shares) return post;

    await this.model('PostData').findOneAndUpdate(
      { post: post._id, communityId },
      { isInFeed: false }
    );
    return post;
  } catch (err) {
    throw err;
  }
};

async function updateParentPostOnRemovingChild(post) {
  const { communityId } = post;
  if (!communityId) {
    throw new Error('error missing post community id!', post.toObject());
  }
  let parent = await post.model('Post').findOne({ _id: post.linkParent });
  parent = await parent.pruneFeed({ communityId });

  if (!parent) return null;

  parent.data = await post.model('PostData').findOne({ post: parent._id, communityId });

  if (!post.data) {
    post.data = await post.model('PostData').findOne({ post: post._id, communityId });
  }

  if (!post.data || !parent.data) throw new Error('missing post data');

  // TODO maybe always update the time?
  const shouldUpdateTime = post.postDate === parent.data.latestComment;
  const shouldUpdateRank = post.data.rank >= parent.data.rank;

  if (shouldUpdateRank || shouldUpdateTime) {
    parent = await parent.updateRank({ communityId, shouldUpdateTime });
  }
  return parent;
}

// TODO we should replace post with a dummy post if post has
// comments or replies so we can preserver
PostSchema.post('remove', async function postRemove(post) {
  try {
    if (post.linkParent && post.type !== 'comment') {
      await updateParentPostOnRemovingChild(post);
    }

    // await this.model('CommunityFeed').removeFromAllFeeds(doc);
    const note = this.model('Notification').remove({ post: post._id });
    const feed = this.model('Feed').remove({ post: post._id });
    const twitterFeed = this.model('TwitterFeed').remove({ post: post._id });
    const data = this.model('PostData').remove({ post: post._id });

    let metaPost;
    let commentNote;
    if (post.type === 'link' && !post.postParent) {
      metaPost = await this.model('MetaPost').remove({ post: post._id });
    }

    // remove notifications
    if (post.type === 'comment' || post.type === 'repost') {
      commentNote = this.model('Notification').remove({ comment: post._id });
    }

    await Promise.all([note, feed, twitterFeed, data, metaPost, commentNote]);
  } catch (err) {
    throw err;
  }
});

module.exports = mongoose.model('Post', PostSchema);


// Update parent feed status (only for link posts)
// PostSchema.statics.updateFeedStatus = async function updateFeedStatus(parent, post) {
//   try {
//     const parentId = parent._id || parent;
//     if (!post) throw new Error('missing post');

//     const { community, hidden } = post;
//     if (!community) throw new Error('missing community');

//     // Thread has no children - remove everything
//     const count = await this.model('Post').count({ parentPost: parentId });

//     if (!count) {
//       console.log('parentId', parentId, post.toObject());
//       console.warn('REMOVING POST FROM ALL FEEDS! ', community);
//       // await this.model('CommunityFeed').removeFromAllFeeds(parentId);

//       await this.model('Post').remove({ _id: parentId });
//       await this.model('MetaPost').remove({ _id: post.metaPost });
//       return;
//     }

//     const communityCount = await this.model('Post').count({
//       parentPost: parentId,
//       community
//     });

//     if (!communityCount && community) {
//       console.log('REMOVING POST FROM COMMUNITY FEED! ', community, parentId);
//       // await this.model('CommunityFeed').removeFromCommunityFeed(parentId, community);
//     } else if (!hidden) {
//       const linkParent = await this.model('Post')
//       .findOne({ _id: parentId })
//       .populate({ path: 'data', match: { community } });

//       // TODO can maybe make this more efficient?
//       let updateTime;
//       if (new Date(post.postDate).getTime() === linkParent.data.latestComment) {
//         updateTime = true;
//       }
//       await linkParent.updateRank(community, updateTime);
//     }
//   } catch (err) {
//     throw err;
//   }
// };
//
