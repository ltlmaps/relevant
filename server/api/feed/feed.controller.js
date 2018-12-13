import Feed from './feed.model';
import Post from '../post/post.model';

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return (err) => {
    res.status(statusCode).send(err);
  };
}

exports.get = async (req, res) => {
  const userId = req.user._id;
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 5;
  const tag = req.query.tag || null;
  let query = { userId };
  if (tag) query = { tags: tag, userId };
  let feed;
  const posts = [];

  try {
    feed = await Feed.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'post',
        populate: [
          {
            path: 'user',
            select: 'name image relevance',
          },
          { path: 'repost.post',
            populate: {
              path: 'user',
              select: 'name image relevance',
            }
          }
        ]
      });

    feed.forEach((f) => {
      if (f.post) posts.push(f.post);
    });
    res.status(200).json(posts);
  } catch (err) {
    handleError(res)(err);
  }

  // TODO worker thread?
  if (userId) {
    const postIds = [];
    posts.forEach(post => {
      postIds.push(post._id || post);
      if (post.repost && post.repost.post) {
        postIds.push(post.repost.post._id);
      }
    });
    Post.sendOutInvestInfo(postIds, userId);
  }
};

exports.unread = (req, res) => {
  let query = null;
  const userId = req.user._id;
  if (userId) {
    query = { userId, read: false };
  }
  Feed.count(query)
    .then((unread) => {
      res.status(200).json({ unread });
    });
};

exports.markRead = (req, res) => {
  const query = { userId: req.user._id, read: false };
  return Feed.update(query, { read: true }, { multi: true })
    .then(() => res.status(200).send())
    .catch(err => handleError(res, err));
};

// for testing
exports.post = (req, res) => {
  const postId = req.params.id;
  Feed.find({ post: postId })
    .sort({ createdAt: -1 })
  // .populate('post')
    .then(feed => {
      res.status(200).json(feed);
    })
    .catch(handleError(res));
};

