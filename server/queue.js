const queue = require('queue');
const computePageRank = require('./utils/pagerankCompute').default;
const Stats = require('./api/statistics/statistics.model');
const Relevance = require('./api/relevance/relevance.model');
const Community = require('./api/community/community.model').default;
const ethRewards = require('./utils/ethRewards.js');

// const { PAYOUT_FREQUENCY } = require('./config/globalConstants');
// const TwitterWorker = require('./utils/twitterWorker');

/* eslint no-console: 0 */

const q = queue({
  concurrency: 5
});

q.on('timeout', (next, job) => {
  console.log('job timed out:', job.toString().replace(/\n/g, ''));
  next();
});

async function updateUserStats() {
  Relevance.find({ global: true }).exec((err, res) => {
    if (err || !res) {
      console.log('db error', err);
      return;
    }
    res.forEach(rel => {
      q.push(cb => {
        const date = new Date();
        const hour = date.getHours();
        const day = date.setUTCHours(0, 0, 0, 0);
        const endTime = day + 24 * 60 * 60 * 1000;
        const query = {
          user: rel.user,
          date: day,
          endTime,
          communityId: rel.communityId
        };
        const set = {};
        set['hours.' + hour] = rel.pagerank || 0;
        const update = {
          $set: set,
          $inc: { aggregateRelevance: rel.pagerank, totalSamples: 1 }
        };
        Stats.findOneAndUpdate(query, update, {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }).exec(statsError => {
          if (!statsError) cb();
          else throw statsError;
        });
      });
    });
    q.start(queErr => {
      if (queErr) return console.log(queErr);
      return console.log('done updating stats');
    });
  });
}

// setTimeout(basicIncome, 10000);

async function getCommunityUserRank(community) {
  try {
    const communityId = community._id;
    const totalUsers = await Relevance.countDocuments({
      pagerank: { $gt: 0 },
      global: true,
      communityId
    });
    // let grandTotal = await Relevance.countDocuments({ global: true, communityId });
    const topUser = await Relevance.findOne({})
    .sort('-pagerank')
    .limit(1);
    const topR = topUser.pagerank;
    const users = await Relevance.find({
      global: true,
      communityId,
      user: { $exists: true }
    });

    return users.forEach(user => {
      q.push(async cb => {
        try {
          const rank = await Relevance.countDocuments({
            pagerank: { $lt: user.pagerank, $gt: 0 },
            communityId
          });
          const percentRank = Math.round((rank * 100) / totalUsers);
          const level = Math.round((1000 * user.pagerank) / topR) / 10;

          user.percentRank = percentRank;
          user.rank = totalUsers - rank;
          user.level = level;
          user.totalUsers = totalUsers;

          // this will update both global and local reps
          const topicRelevance = await Relevance.find({
            user: user._id,
            tag: { $ne: null },
            communityId
          })
          .sort('-relevance')
          .limit(5);

          user.topTopics = topicRelevance.map(tR => tR.tag);

          // TODO this may not work!
          const topicPromises = topicRelevance.map(async tR => {
            const topTopicUser = await Relevance.findOne({ tag: tR.tag, communityId })
            .sort('-relevance')
            .limit(1);
            const topTopicR = topTopicUser.relevance;

            const totalTopicUsers = await Relevance.find({
              tag: tR.tag
            }).countDocuments();
            const topicRank = await Relevance.countDocuments({
              tag: tR.tag,
              relevance: { $lt: tR.relevance }
            });

            const topicPercentRank = Math.round((topicRank * 100) / totalTopicUsers);

            tR.percentRank = topicPercentRank;
            tR.level = Math.round(1000 * (tR.relevance / topTopicR)) / 10;
            tR.rank = totalTopicUsers - topicRank;
            tR.totalUsers = totalTopicUsers;

            // console.log('_TAGS_', user.user, ' ', tR.tag);
            // console.log('percent ', topicPercentRank);
            // console.log('rank ', (totalTopicUsers - topicRank));
            // console.log('level ', tR.level);

            return tR.save();
          });

          if (!user.onboarding || typeof user.onboarding !== 'number') {
            user.onboarding = 0;
          }

          await Promise.all([...topicPromises]);

          await user.save();
          // console.log('percentRank', user.user, ' ', percentRank);
          // console.log('rank', user.user, ' ', user.rank);
          // console.log('level', user.user, ' ', level);
        } catch (err) {
          return console.log(err);
        }
        return cb();
      });
    });
  } catch (err) {
    return console.log('error computing rank for ', community.slug, err);
  }
}

// update reputation using pagerank
async function updateReputation() {
  try {
    const communities = await Community.find({});
    const communityRank = communities.map(getCommunityUserRank);
    await Promise.all(communityRank);
    console.log('finished computing reputation');
  } catch (err) {
    console.log(err);
  }
}

async function basicIncome(done) {
  const topicRelevance = await Relevance.find({ global: true });

  function updateTopicRelevance() {
    console.log('updating topic relevance');
    return topic => {
      q.push(async cb => {
        try {
          if (topic.user) {
            // updates % stats
            await topic.updateRelevanceRecord();
            await topic.save();
          }
        } catch (err) {
          console.log('error updating topic relevance income ', err);
          console.log(topic);
          cb();
        }
        cb();
      });
    };
  }

  topicRelevance.forEach(updateTopicRelevance());

  q.start(queErr => {
    if (queErr) return console.log(queErr);
    if (done) done();
    return console.log('all finished basic income: ');
  });

  q.on('timeout', (next, job) => {
    console.log('error: queue timeout', job);
    next();
  });
}

// eslint-disable-next-line
async function pagerank(community) {
  const communityId = (await Community.findOne({ slug: community }))._id;
  await computePageRank({ communityId, community, debug: true });
}

function getNextUpdateTime() {
  console.log('get next time');
  const now = new Date();
  const h = now.getUTCHours();
  console.log(h);
  const nextUpdate = new Date();
  const computeHour = 14;

  if (h < computeHour) {
    nextUpdate.setUTCHours(14, 0, 0, 0);
  } else {
    nextUpdate.setDate(now.getDate() + 1);
    nextUpdate.setUTCHours(14, 0, 0, 0);
  }

  const timeToUpdate = nextUpdate.getTime() - now.getTime();
  console.log('now ', now);
  console.log('next update ', nextUpdate);

  global.nextUpdate = nextUpdate;
  return timeToUpdate;
}

getNextUpdateTime();

// function startBasicIncomeUpdate() {
//   // basic income is DEPRECATED
//   basicIncome();
//   setTimeout(() => {
//     startBasicIncomeUpdate();
//   }, getNextUpdateTime());
// }

// function startStatsUpdate() {
//   // taking too long - should move to diff thread?
//   setInterval(updateUserStats, 60 * 60 * 1000);
//   updateUserStats();
// }

async function updateRewards() {
  await ethRewards.rewards();
  updateUserStats();
  const now = new Date();
  if (now.getUTCHours() === 14) {
    basicIncome();
  }
}

// function startRewards() {
//   // taking too long - should move to diff thread?
//   setInterval(updateRewards, PAYOUT_FREQUENCY);
//   updateRewards(updateReputation);
// }

// eslint-disable-next-line
// function startTwitterUpdate() {
//   setInterval(TwitterWorker.updateTwitterPosts, 60 * 60 * 1000);
//   TwitterWorker.updateTwitterPosts();
// }

// updateUserStats(/);
// startTwitterUpdate();
// startBasicIncomeUpdate();
// startRewards();
// updateRewards();

if (process.env.NODE_ENV !== 'production') {
  // startTwitterUpdate();
}

if (process.env.NODE_ENV === 'production') {
  updateRewards();
  // start interval on the hour
  // const minutesTillHour = 60 - new Date().getMinutes();
  // setTimeout(() => {
  //   startStatsUpdate();
  // }, minutesTillHour * 60 * 1000);
  // setTimeout(() => {
  //   startRewards();
  // }, (15 + minutesTillHour) * 60 * 1000);
  // setTimeout(() => {
  //   startTwitterUpdate();
  // }, ((10 + minutesTillHour) % 60) * 60 * 1000);
  // TwitterWorker.updateTwitterPosts();
  // DEPRECATED
  // setTimeout(() => {
  //   startBasicIncomeUpdate();
  // }, getNextUpdateTime());
}

// pagerank('crypto');
// pagerank('relevant');

// setTimeout(TwitterWorker.updateTwitterPosts, 5000);

module.exports = {
  updateUserStats,
  basicIncome,
  updateReputation
};
