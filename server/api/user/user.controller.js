import jwt from 'jsonwebtoken';
import crypto from 'crypto-promise';
import sigUtil from 'eth-sig-util';
import User from './user.model';
import Comment from '../comment/comment.model';
import Post from '../post/post.model';
import Relevance from '../relevance/relevance.model';
import mail from '../../mail';
import Subscription from '../subscription/subscription.model';
import Feed from '../feed/feed.model';
import * as ethUtils from '../../utils/ethereum';

const TwitterWorker = require('../../utils/twitterWorker');

async function sendConfirmation(user, newUser) {
  let text = '';
  if (newUser) text = 'Welcome to Relevant! ';
  try {
    const url = `${process.env.API_SERVER}/user/confirm/${user.handle}/${user.confirmCode}`;
    const data = {
      from: 'Relevant <noreply@mail.relevant.community>',
      to: user.email,
      subject: 'Relevant Email Confirmation',
      html: `${text}Click on this link to confirm your email address:
      <br />
      <br />
      <a href="${url}" target="_blank">${url}</a>
      <br />
      <br />
      Once you confirm your email you will be able to invite your friends to the app!
      `
    };
    await mail.send(data);
  } catch (err) {
    throw err;
  }
  return { email: user.email };
}

async function sendResetEmail(user) {
  let status;
  try {
    const url = `${process.env.API_SERVER}/user/resetPassword/${user.resetPasswordToken}`;
    const data = {
      from: 'Relevant <noreply@mail.relevant.community>',
      to: user.email,
      subject: 'Reset Relevant Password',
      html: `You are receiving this because you (or someone else) have requested the reset of the password for your account.<br />
      Please click on the following link, or paste this into your browser to complete the process:<br/><br/>
      ${url}<br/><br/>
      If you did not request this, please ignore this email and your password will remain unchanged.`
    };
    status = await mail.send(data);
  } catch (err) {
    throw err;
  }
  return status;
}

exports.forgot = async (req, res, next) => {
  let email;
  try {
    const string = req.body.user;
    let user;
    let query;

    email = /^.+@.+\..+$/.test(string);
    query = email ? { email: string } : { handle: string };
    user = await User.findOne(query, 'resetPasswordToken resetPasswordExpires email handle');
    const rand = await crypto.randomBytes(32);
    const token = rand.toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    user = await user.save();
    await sendResetEmail(user);
    return res.status(200).json({ email: user.email, username: user.handle });
  } catch (err) {
    let error = new Error('Couldn\'t find user with this name ', err);
    if (email) {
      error = new Error('No user with this email exists');
    }
    return next(error);
  }
};

exports.confirm = async (req, res, next) => {
  let user;
  let middleware = false;
  if (req.params.user) middleware = true;
  try {
    const confirmCode = req.params.code || req.body.code;
    const handle = req.params.user || req.body.user;
    if (!handle || !confirmCode) throw new Error('Missing user id or confirmation token');
    user = await User.findOne({ handle, confirmCode }, 'confirmCode confirmed email');
    if (user && !user.confirmed) {
      // Invite.generateCodes(user);
      user.confirmed = true;
      user = await user.save();
    } else {
      req.unconfirmed = true;
    }
    if (!user) throw new Error('Wrong confirmation code');
  } catch (err) {
    return middleware ? next() : (err);
  }
  return middleware ? next() : res.status(200).json(user);
};

exports.sendConfirmationCode = async (req, res, next) => {
  try {
    let user = await User.findOne({ handle: req.user.handle }, 'email confirmCode');
    const rand = await crypto.randomBytes(32);
    const token = rand.toString('hex');
    user.confirmCode = token;
    user = await user.save();
    const status = await sendConfirmation(user);
    return res.status(200).json(status);
  } catch (err) {
    return next(err);
  }
};

exports.onboarding = (req, res, next) => {
  const handle = req.user.handle;
  const step = req.params.step;
  User.findOneAndUpdate(
    { handle },
    { onboarding: step },
    { projection: 'onboarding', new: true }
  )
    .then(newUser => {
      res.status(200).json(newUser);
    })
    .catch(next);
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const token = req.body.token;
    if (!token) throw new Error('token missing');
    let user = await User.findOne({ resetPasswordToken: token });
    if (!user) throw new Error('No user found');
    if (!user.onboarding) user.onboarding = 0;
    const password = req.body.password;
    if (user.resetPasswordExpires > Date.now()) {
      throw new Error('Password reset time has expired');
    }
    user.password = password;
    user = await user.save();
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};


/**
 * Change a users password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const oldPass = String(req.body.oldPassword);
    const newPass = String(req.body.newPassword);
    const user = User.findById(userId);
    if (user.authenticate(oldPass)) {
      user.password = newPass;
      await user.save();
      return res.sendStatus(200);
    }
    throw new Error('incorrect password');
  } catch (err) {
    return next(err);
  }
};

exports.search = (req, res, next) => {
  let blocked = [];
  if (req.user) {
    const user = req.user;
    blocked = [...user.blocked, ...user.blockedBy];
  }

  const search = req.query.search;
  const limit = req.query.limit;
  const name = new RegExp(search, 'i');
  const query = {
    $and: [
      { $or: [
        { name },
        { handle: name }
      ] },
      { handle: { $nin: blocked } }
    ]
  };
  User.find(query, 'name image')
    .sort({ handle: 1 })
    .limit(parseInt(limit, 10))
    .then((users) => {
      res.json(200, users);
    })
    .catch(next);
};


/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = (req, res, next) => {
  const search = req.query.search;
  let query = {};
  if (search) {
    const name = new RegExp(req.query.name, 'i');
    query = { name };
  }

  User.find(query, '-salt -hashedPassword').sort({ rank: -1 })
    .then((users) => {
      res.status(200).json(users);
    })
    .catch(next);
};

exports.checkUser = async (req, res, next) => {
  try {
    const name = req.query.name;
    const email = req.query.email;
    let query = {};
    let type;

    if (name === 'everyone') {
      return res.status(200).json({ type });
    }

    if (name) {
      type = 'user';
      const formatted = '^' + name + '$';
      query = { ...query, handle: { $regex: formatted, $options: 'i' } };
    } else if (email) {
      type = 'email';
      query = { email };
    }

    const userExists = await User.findOne(query, 'handle');
    if (userExists) return res.status(200).json({ type });
    return res.status(200).json(null);
  } catch (err) {
    return next(err);
  }
};

exports.testData = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = parseInt(req.query.skip, 10) || 0;
    const community = req.query.community || 'relevant';
    const query = { global: true, community, pagerank: { $gt: 0 } };

    const rel = await Relevance.find(query, 'pagerank level community communityId pagerankRaw')
      .limit(limit)
      .skip(skip)
    // .sort(sort)
      .populate({
        path: 'user',
        select: 'handle name votePower image bio'
      });

    return res.status(200).json(rel);
  } catch (err) {
    return next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = parseInt(req.query.skip, 10) || 0;
    let topic = req.query.topic || null;
    let users;

    let blocked = [];
    if (req.user) {
      const user = req.user;
      blocked = [...user.blocked, ...user.blockedBy];
    }
    const community = req.query.community || 'relevant';

    let query;
    let sort;
    if (topic && topic !== 'null') {
      // TODO should topic relevance be limited to community? maybe not?
      query = { tag: topic, community, user: { $nin: blocked } };
      sort = { relevance: -1 };
    } else {
      topic = null;
      sort = { pagerank: -1 };
      query = { global: true, community, user: { $nin: blocked } };
    }

    const rel = await Relevance.find(query)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .populate({
        path: 'user',
        select: 'handle name votePower image bio'
      });

    users = rel.map(r => {
      r = r.toObject();
      if (!r.user) return null;
      const user = { ...r.user };
      user.relevance = {};
      delete r.user;
      if (topic) user[topic + '_relevance'] = r.relevance;
      else user.relevance = r;
      return user;
    });

    return res.status(200).json(users);
  } catch (err) {
    return next(err);
  }
};


/**
 * Creates a new user
 * make sure to mimic logic in updateHandle TODO - refactor
 */
exports.create = async (req, res, next) => {
  try {
    let token;
    const rand = await crypto.randomBytes(32);
    const confirmCode = rand.toString('hex');

    let user = req.body.user;

    let invite;
    // if (community === 'relevant') {
    //   invite = await Invite.checkInvite(req.body.invite);
    // }

    const confirmed = invite && invite.email === user.email;

    if (user.name === 'everyone') throw new Error('username taken');

    const userObj = {
      _id: user.name,
      handle: user.name,
      name: user.name,
      phone: user.phone,
      email: user.email,
      password: user.password,
      image: user.image,
      provider: 'local',
      role: 'user',
      relevance: 0,
      confirmed,
      confirmCode
    };

    user = new User(userObj);
    user = await user.save();

    if (invite) {
      await invite.registered(user);
    }

    token = jwt.sign(
      { _id: user._id },
      process.env.SESSION_SECRET,
      { expiresIn: 60 * 5 * 60 }
    );

    if (!confirmed) sendConfirmation(user, true);
    // else Invite.generateCodes(user);

    user = await user.initialCoins();
    user = await user.save();

    return res.status(200).json({ token, user });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get a single user
 */
exports.show = async function show(req, res, next) {
  try {
    let handle = req.params.id;
    let me = null;
    if (!handle) {
      handle = req.user.handle;
      me = true;
    }

    const community = req.query.community || 'relevant';

    // don't show blocked user;
    let blocked = [];
    if (req.user) {
      const user = req.user;
      blocked = [...user.blocked || [], ...user.blockedBy || []];
      if (blocked.find(u => u === handle)) {
        return res.status(200).json({});
      }
    }

    let user = await User.findOne({ handle })
      .populate({
        path: 'relevance',
        match: { community, global: true },
        select: 'pagerank relevanceRecord'
      });

    if (!user) throw new Error('no such user ', handle);
    user = await user.getSubscriptions();

    // topic relevance
    const relevance = await Relevance.find({ user: handle, tag: { $ne: null } })
      .sort('-relevance')
      .limit(5);
    const userObj = user.toObject();
    userObj.topTags = relevance || [];

    res.status(200).json(userObj);

    // update token balance based on ETH account
    if (me) {
      const addr = user.ethAddress[0];
      const tokenBalance = addr ? await ethUtils.getBalance(user.ethAddress[0]) : 0;
      if (user.tokenBalance !== tokenBalance) {
        user.tokenBalance = tokenBalance;
        user = await user.save();
        await user.updateClient();
      }
    }
    return null;
  } catch (err) {
    return next(err);
  }
};

/**
 * Deletes a user
 * restriction: 'admin' or user
 */
exports.destroy = async (req, res, next) => {
  try {
    if (!req.user ||
      (!req.user.role === 'admin' &&
      req.user.handle !== req.params.handle)) {
      throw new Error('no right to delete');
    }
    await User.findOne({ handle: req.params.id }).remove();
    return res.sendStatus(204);
  } catch (err) {
    return next(err);
  }
};

// TODO refactor to use same logic as create
exports.updateHandle = async (req, res, next) => {
  try {
    let user = req.user;
    const twitterId = user._id;
    if (user.role !== 'temp') throw new Error('Cannot change user handle');

    if (user._id.toString() !== user.twitterId.toString() &&
      user._id.toString() !== user.twitter.id_str
    ) throw new Error('TwitterId doesn\'t match user', user._id, user.twitterId);

    const handle = req.body.user.handle;
    if (!handle) throw new Error('missing handle');

    // make sure its not used
    if (handle !== req.user.handle) {
      const used = await User.findOne({ handle });
      if (used) throw new Error('This handle is already taken');
    }

    user = await User.findOne(
      { _id: twitterId },
      '+email +twitterAuthSecret +twitterAuthToken +twitterEmail'
    );
    user = user.toObject();
    user.role = 'user';
    user.handle = handle;
    user._id = handle;

    const updatedUser = new User(user);

    await User.findOne({ _id: twitterId }).remove();

    user = updatedUser;

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.SESSION_SECRET,
      { expiresIn: 60 * 5 * 60 }
    );

    await TwitterWorker.updateTwitterPosts(user._id);

    user = await user.initialCoins();
    user = await user.save();

    return res.status(200).json({ token, user });
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const role = req.user.role;
    const authUser = JSON.stringify(req.user._id);
    const reqUser = JSON.stringify(req.body._id);
    let updateImage = false;
    let updateName = false;
    let user;

    if (authUser !== reqUser && role !== 'admin') {
      throw new Error('Not authorized to edit this user');
    }
    user = await User.findOne({ _id: req.body._id }, '-salt -hashedPassword -relevance');
    if (!user) throw new Error('user not found');

    if (user.name !== req.body.name) {
      updateName = true;
      user.name = req.body.name;
    }
    if (user.image !== req.body.image) {
      updateImage = true;
      user.image = req.body.image;
    }

    user.bio = typeof req.body.bio === 'string' ? req.body.bio : user.bio;
    user.deviceTokens = req.body.deviceTokens;

    if (role === 'admin') {
      user.role = req.body.role;
    }

    user = await user.save();
    user.updateClient();

    if (updateName || updateImage) {
      const newUser = {
        name: user.name,
        image: user.image
      };

      // Do this on a separate thread?
      await Post.update(
        { user: user.handle },
        { embeddedUser: newUser },
        { multi: true }
      );

      await Comment.update(
        { user: user.handle },
        { embeddedUser: newUser },
        { multi: true }
      );
    }
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};


exports.block = async (req, res, next) => {
  try {
    let user = req.user;
    const block = req.body.block;

    if (user.handle === block) throw new Error('You can\'t block yourself!');

    const userPromise = User.findOneAndUpdate(
      { handle: user.handle },
      { $addToSet: { blocked: block } },
      { new: true }
    );
    const blockPromise = User.findOneAndUpdate(
      { handle: block },
      { $addToSet: { blockedBy: user.handle } },
      { new: true }
    );

    // clear any existing subscriptions
    const sub1 = Subscription.remove({ following: user.handle, follower: block });
    const sub2 = Subscription.remove({ following: block, follower: user.handle });
    const feed1 = Feed.remove({ userId: user.handle, from: block });
    const feed2 = Feed.remove({ userId: block, from: user.handle });

    const results = await Promise.all([userPromise, blockPromise, sub1, sub2, feed1, feed2]);
    user = results[0];
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};

exports.unblock = async (req, res, next) => {
  try {
    let user = req.user;
    let block = req.body.block;
    user = await User.findOneAndUpdate(
      { handle: user.handle },
      { $pull: { blocked: block } },
      { new: true }
    );
    block = await User.findOneAndUpdate(
      { handle: block },
      { $pull: { blockedBy: user.handle } },
    );
    res.status(200).json(user);
  } catch (err) {
    next(res, err);
  }
};

exports.blocked = async (req, res, next) => {
  try {
    let user = req.user;
    user = await User.findOne({ handle: user.handle }).populate('blocked');
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateUserTokenBalance = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.ethAddress || !user.ethAddress.legnth) throw new Error('missing connected Ethereum address');
    const userBalance = await ethUtils.getBalance(user.ethAddress[0]);
    user.tokenBalance = userBalance;
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.ethAddress = async (req, res, next) => {
  try {
    let user = req.user;
    const { msg, sig, acc } = req.body;
    const recovered = sigUtil.recoverTypedSignature({
      data: msg,
      sig
    });
    if (recovered !== acc.toLowerCase()) throw new Error('address does not match');

    const exists = await User.findOne({ ethAddress: acc }, 'handle');
    if (exists) throw new Error('This address is already in use by @' + exists.handle);

    user = await User.findOne({ handle: user.handle }, 'ethAddress');
    user.ethAddress = [acc];

    const userBalance = await ethUtils.getBalance(user.ethAddress[0]);
    user.tokenBalance = userBalance;
    await user.save();
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

exports.cashOut = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new Error('missing user');
    if (!user.ethAddress[0]) throw new Error('No Ethereum address connected');
    let amount = user.balance;
    const address = user.ethAddress[0];

    // if the nonce is the same as last time, resend last signature
    const nonce = await ethUtils.getNonce(address);
    if (user.cashOut && user.cashOut.nonce === nonce) {
      amount = user.cashOut.amount;
      // return res.status(200).json(user);
    }

    if (amount < 100) throw new Error('Balance is too small to withdraw');
    const distributedRewards = await ethUtils.getParam('distributedRewards');

    if (distributedRewards < amount) throw new Error('There are not enough funds in contract at the moment');

    // make sure we 0 out the balance
    user.balance = 0;
    await user.save();

    const sig = await ethUtils.sign(address, amount);
    user.nonce = nonce;
    user.cashOut = { sig, amount, nonce };
    await user.save();
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};

/**
 * Authentication callback
 */
exports.authCallback = (req, res) => {
  res.redirect('/');
};
