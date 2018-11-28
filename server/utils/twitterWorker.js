import Meta from '../api/links/link.model';
import Post from '../api/post/post.model';
import * as postController from '../api/post/post.controller';
import TwitterFeed from '../api/twitterFeed/twitterFeed.model';
// TODO replace this with community
import Treasury from '../api/treasury/treasury.model';
import Relevance from '../api/relevance/relevance.model';
import Community from '../api/community/community.model';
// this is needed inside post.model (when removing posts);
// eslint-disable-next-line
import CommunityFeed from '../api/communityFeed/communityFeed.model';

import { TWITTER_DECAY } from '../config/globalConstants';

let DEFAULT_COMMINITY = 'relevant';
let DEFAULT_COMMINITY_ID;

const TENTH_LIFE = 1 * 6 * 60 * 60 * 1000;


const Twitter = require('twitter');
const User = require('../api/user/user.model');
const queue = require('queue');

let allUsers;

let userCounter = 0;
let processedTweets = 0;

let q = queue({ concurrency: 1 });

q.on('timeout', (next, job) => {
  console.log('job timed out:', job.toString().replace(/\n/g, ''));
  next();
});

let avgTwitterScore = 0;
let twitterCount = 0;

async function computeRank(linkPost) {
  let rank = 0
    + linkPost.seenInFeedNumber
    + Math.log(linkPost.twitterScore + 1) * 5;

  // use user's relevance score to rank feed?
  // let feedRelevance = metaPost.feedRelevance ? Math.log(metaPost.feedRelevance + 1) : 0;
  // rank += feedRelevance * 3;

  avgTwitterScore = (rank + avgTwitterScore * twitterCount) / (twitterCount + 1);
  twitterCount++;
  let personalize = avgTwitterScore * 10;

  let newRank = (linkPost.latestComment.getTime() / TENTH_LIFE) + Math.log10(rank + 1);
  let inFeedRank = (linkPost.latestComment.getTime() / TENTH_LIFE) +
    Math.log10(personalize + rank + 1);
  newRank = Math.round(newRank * 1000) / 1000;
  inFeedRank = Math.round(inFeedRank * 1000) / 1000;

  // console.log(metaPost.latestTweet);
  // console.log('time ', metaPost.latestTweet);
  // console.log(metaPost.title);
  // console.log('rank ', rank);
  // console.log('own rank', rank + 50);
  // console.log('avgTwitterScore ', avgTwitterScore);
  // console.log('twitterCount ', twitterCount);

  return { newRank, inFeedRank };
}

async function updateRank() {
  try {
    let treasury = await Treasury.findOne();

    let now = new Date();
    let lastUpdate = treasury.lastTwitterUpdate ? treasury.lastTwitterUpdate.getTime() : 0;
    let decay = (now.getTime() - lastUpdate) / TWITTER_DECAY;

    avgTwitterScore = treasury.avgTwitterScore * (1 - Math.min(1, decay)) || 0;
    twitterCount = treasury.twitterCount * (1 - Math.min(1, decay)) || 0;

    let metaPosts = await Meta.find({ twitter: true }).sort({ lastTwitterUpdate: -1 }).limit(20000);
    // console.log('got posts, updating...');
    metaPosts.forEach(async metaPost => {
      let { newRank, inFeedRank } = await computeRank(metaPost);
      await TwitterFeed.update(
        { metaPost: metaPost._id, inTimeline: { $ne: true } },
        { rank: newRank },
        { upsert: false, multi: true }
      );
      await TwitterFeed.update(
        { metaPost: metaPost._id, inTimeline: true },
        { rank: inFeedRank },
        { upsert: false, multi: true }
      );
    });
  } catch (err) {
    return console.log('error updating twitter rank ', err);
  }
}

// updateRank();

async function processTweet(tweet, user) {
  let originalTweet = tweet;
  if (tweet.retweeted_status) {
    tweet = tweet.retweeted_status;
  }

  if (!tweet.entities.urls.length || !tweet.entities.urls[0].url) {
    return;
  }

  if (tweet.entities.urls[0].expanded_url.match('twitter.com')) return;

  // check if tw post exists
  // if it does, update feed and increment 'seen in feed counter'
  let post = await Post.findOne({ twitter: true, twitterId: tweet.id })
  .populate({
    path: 'data',
    match: { communityId: DEFAULT_COMMINITY_ID }
  });
  // let metaPost;
  let linkParent;

  if (post) {
    linkParent = await Post.findOne({ _id: post.linkParent });
    if (!linkParent) {
      console.log('existing post with no parent', post);
      post = await post.populate('metaPost');
      let processed = post.metaPost;

      if (!processed) {
        console.log('missing metapost', post);
        return;
      }

      let linkObject = {
        title: processed.title,
        url: processed.url,
        description: processed.description,
        image: processed.image,
        articleAuthor: processed.articleAuthor,
        domain: processed.domain,
        // TODO we are not using this
        shortText: processed.shortText,
        keywords: processed.keywords,
        seenInFeedNumber: 2,
      };
      // if (!post.data) {
      //   post = await post.addPostData();
      // }
      // post = await post.upsertLinkParent(linkObject);
      // linkParent = post.linkParent;
    } else {
      linkParent.seenInFeedNumber += 1;
      await linkParent.save();
    }
  } else {
    let processed = await Meta.findOne({ twitterUrl: tweet.entities.urls[0].expanded_url });

    if (!processed) {
      processed = await postController.previewDataAsync(tweet.entities.urls[0].expanded_url);
      processedTweets++;
    }

    let dupPost = await Post.findOne({ twitterUser: tweet.user.id, link: processed.url });
    if (dupPost) return;

    let body = tweet.full_text
    .replace(new RegExp(tweet.entities.urls[0].url, 'g'), '')
    .replace(/&amp;/, '&');

    let tags = tweet.entities.hashtags.map(t => t.text);
    let linkObject = {
      title: processed.title,
      url: processed.url,
      description: processed.description,
      image: processed.image,
      articleAuthor: processed.articleAuthor,
      domain: processed.domain,
      // TODO we are not using this
      shortText: processed.shortText,
      keywords: processed.keywords,
    };

    post = new Post({
      // for now only pull tweets for relevant community
      community: DEFAULT_COMMINITY,
      communityId: DEFAULT_COMMINITY_ID,
      title: processed.title,
      body,
      tags,
      postDate: originalTweet.created_at,

      embeddedUser: {
        handle: tweet.user.screen_name,
        name: tweet.user.name,
        id: tweet.user.screen_name,
        image: tweet.user.profile_image_url_https.replace('_normal', '')
      },
      category: [],

      twitterUser: tweet.user.id,
      twitterId: tweet.id,
      twitterScore: 2 * tweet.retweet_count + tweet.favorite_count,
      twitter: true,
      // feedRelevance: user.relevance || 0,
      twitterUrl: tweet.entities.urls[0].expanded_url,
      seenInFeedNumber: 1,
      hidden: true,
    });

    post = await post.addPostData();
    post = await post.upsertLinkParent(linkObject);

    linkParent = post.linkParent;
    // let heapUsed = process.memoryUsage().heapUsed;
    // let mb = Math.round(100 * heapUsed / 1048576) / 100;
    // console.log('Program is using ' + mb + 'MB of Heap.');

    processed = null;
    await post.save();
  }

  let parentId = linkParent._id;
  let { newRank, inFeedRank } = await computeRank(linkParent, user);

  let feedObject = {
    rank: newRank,
    tweetDate: linkParent.latestComment,
  };

  // make sure everyone gets it
  await TwitterFeed.update(
    { user: '_common_Feed_', post: parentId },
    feedObject,
    { upsert: true }
  ).exec();


  let updateAllUsers = allUsers.map(async u => {
    return TwitterFeed.update(
      { user: u, post: parentId },
      feedObject,
      { upsert: true }
    ).exec();
  });

  await Promise.all(updateAllUsers);

  // update current user
  await TwitterFeed.findOneAndUpdate(
    { user: user._id, post: parentId },
    { ...feedObject, inTimeline: true, rank: inFeedRank },
    { upsert: true, new: true }
  );

  // update rank of existing posts
  await TwitterFeed.update(
    { post: parentId, inTimeline: true },
    { ...feedObject, rank: inFeedRank },
    { upsert: false, multi: true }
  );
}

async function getUserFeed(user) {
  try {
    const client = new Twitter({
      consumer_key: process.env.TWITTER_ID,
      consumer_secret: process.env.TWITTER_SECRET,
      access_token_key: user.twitterAuthToken,
      access_token_secret: user.twitterAuthSecret
    });
    // console.log(user.lastTweetId.toString());

    const params = {
      since_id: user.lastTweetId ? user.lastTweetId.toString() : undefined,
      screen_name: user.twitterHandle,
      exclude_replies: true,
      count: 40,
      tweet_mode: 'extended'
    };

    let feed = await client.get('statuses/home_timeline', params);

    if (feed && feed.length) {
      let lastId = feed[0].id;
      user.lastTweetId = lastId;
      user = await user.save();
    }

    if (!feed) feed = [];

    feed.map((tweet, j) =>
      q.push(async cb => {
        try {
          let post = await processTweet(tweet, user);
          if (j === feed.length - 1) {
            console.log('processing user ', userCounter + 1, ' out of ', allUsers.length, ' tweets: ', feed.length);
            userCounter++;
          }
          cb();
          return post;
        } catch (err) {
          console.log(err);
          return null;
        }
      })
    );
    return Promise.all(feed);
  } catch (err) {
    return console.log('couldn\'t get user feed ', err);
  }
}

async function cleanup(users) {
  let now = new Date();

  // TODO fix this
  let posts = await Post.find({
    twitter: true,
    hidden: true,
    postDate: { $lt: now.getTime() - 3 * 24 * 60 * 60 * 1000 }
  })
  .limit(1000);

  console.log('clearing twitter posts ', posts.length, ' posts');
  let removePosts = await posts.map(p => p.remove());

  await Promise.all(removePosts);

  console.log('processing ', users.length, ' users');
  let processedUsers = users.map(async (u, i) => {
    try {
      let trim = await TwitterFeed.find({ user: '_common_Feed_' })
      .sort({ rank: -1 })
      .skip(1000);
      let ids = trim.map(t => t._id);
      await TwitterFeed.remove({ _id: { $in: ids } });

      trim = await TwitterFeed.find({ user: u._id })
      .sort({ rank: -1 })
      .skip(1000);
      ids = trim.map(t => t._id);
      await TwitterFeed.remove({ _id: { $in: ids } });

      return await getUserFeed(u, i);
    } catch (err) {
      console.log('error getting user feed ', err);
      return null;
    }
  });

  await Promise.all(processedUsers);
}


async function getUsers(userId) {
  try {
    let community = await Community.findOne({ slug: DEFAULT_COMMINITY });
    DEFAULT_COMMINITY_ID = community._id;

    // for now we are only pulling tweets for the relevant community
    let userList = await Relevance.find({ community: 'relevant', global: true, pagerank: { $gt: 1 } })
    .sort({ pagerank: -1 });
    userList = userList.map(u => u.user);

    let query = userId ? { _id: userId } : { _id: { $in: userList } };

    let users = await User.find(
      { twitterHandle: { $exists: true }, ...query },
      'twitterAuthToken twitterAuthSecret twitterHandle lastTweetId relevance'
    );

    let treasury = await Treasury.findOne();

    let now = new Date();
    let lastUpdate = treasury.lastTwitterUpdate ? treasury.lastTwitterUpdate.getTime() : 0;

    let decay = (now.getTime() - lastUpdate) / TWITTER_DECAY;

    avgTwitterScore = treasury.avgTwitterScore * (1 - Math.min(1, decay)) || 0;
    twitterCount = treasury.twitterCount * (1 - Math.min(1, decay)) || 0;

    console.log('avg score from db ', avgTwitterScore);
    console.log('avg count from db ', twitterCount);

    allUsers = users.map(u => u._id);

    userCounter = 0;
    processedTweets = 0;

    await cleanup(users);

    q.start(async queErr => {
      try {
        if (queErr) return console.log(queErr);

        // TODO should be getting this from community
        treasury.twitterCount = twitterCount;
        treasury.avgTwitterScore = avgTwitterScore;
        treasury.lastTwitterUpdate = new Date();

        let finished = new Date();
        let time = finished.getTime() - now.getTime();
        time /= (1000 * 60);
        console.log('processed ', processedTweets, ' tweets', ' in ', time, 'min');

        await treasury.save();

        return console.log('finished processing tweets');
      } catch (err) {
        return console.log(err);
      }
    });
  } catch (err) {
    console.log('twitter error ', err);
  }
}

// setTimeout(getUsers, 3000);
module.exports = {
  updateTwitterPosts: getUsers
};

