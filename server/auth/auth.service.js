import jwt from 'jsonwebtoken';
import expressJwt from 'express-jwt';
import compose from 'composable-middleware';
import config from '../config/config';
import User from '../api/user/user.model';

let validateJwt = expressJwt({ secret: config.secrets.session, ignoreExpiration: true });

function currentUser(req, res) {
  return compose()
  .use((req, res, next) => {
    let token = req.cookies.token;
    if (token) {
      req.headers.authorization = 'Bearer ' + token;
    }
    validateJwt(req, res, (err, decoded) => {
      if (err || !req.user) return next();
      User.findById(req.user._id, (err, user) => {
        if (err) return next();
        if (!user) return next();
        req.user = user;
        return next();
      });
    });
  });
}

function authMiddleware(req, res) {
  return compose()
    // Validate jwt
  .use((req, res, next) => {
    // allow access_token to be passed through query parameter as well
    if (req.query && req.query.hasOwnProperty('access_token')) {
      req.headers.authorization = 'Bearer ' + req.query.access_token;
    }

    validateJwt(req, res, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    });
  });
}


/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function isAuthenticated() {
  return compose()
  // Validate jwt
  .use((req, res, next) => {
    // allow access_token to be passed through query parameter as well
    if (req.query && req.query.hasOwnProperty('access_token')) {
      req.headers.authorization = 'Bearer ' + req.query.access_token;
    }
    validateJwt(req, res, next);
  })
  // Attach user to request
  .use((req, res, next) => {
    User.findById(req.user._id, (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: 'Authentication failed.' });
      req.user = user;
      return next();
    });
  });
}

/**
 * Checks if the user role meets the minimum requirements of the route
 */
function hasRole(roleRequired) {
  if (!roleRequired) throw new Error('Required role needs to be set');

  return compose()
  .use(isAuthenticated())
  .use((req, res, next) => {
    if (config.userRoles.indexOf(req.user.role) >= config.userRoles.indexOf(roleRequired)) {
      next();
    } else {
      res.send(403);
    }
  });
}

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id, role) {
  return jwt.sign({ _id: id, role }, config.secrets.session, { expiresIn: '7 days' });
}

/**
 * Set token cookie directly for oAuth strategies
 */
function setTokenCookie(req, res) {
  if (!req.user) return res.json(404, { message: 'Something went wrong, please try again.' });

  let token = signToken(req.user._id, req.user.role);

  res.cookie('token', token);
  return res.redirect('/');
}

exports.isAuthenticated = isAuthenticated;
exports.hasRole = hasRole;
exports.signToken = signToken;
exports.setTokenCookie = setTokenCookie;
exports.authMiddleware = authMiddleware;
exports.currentUser = currentUser;
