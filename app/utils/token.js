let userDefaults;
let cookie;

if (process.env.WEB !== 'true' && process.env.NODE_ENV !== 'test') {
  // userDefaults = require('react-native-user-defaults').default;
  userDefaults = require('react-native-swiss-knife').RNSKBucket;
} else {
  const Cookies = require('universal-cookie');
  cookie = new Cookies();
}

const APP_GROUP_ID = 'group.com.4real.relevant';

let token;

export function get() {
  return new Promise((resolve, reject) => {
    if (token) return resolve(token);

    if (userDefaults) {
      return userDefaults
      .get('token', APP_GROUP_ID)
      .then(newToken => {
        if (newToken) {
          token = newToken;
          return resolve(token);
        }
        return reject();
      })
      .catch(err => reject(err));
    }
    // WEB
    const newToken = cookie.get('token', { path: '/' });
    if (newToken) {
      token = newToken;
      return resolve(token);
    }
    return resolve(token);
    // reject(new Error('not logged in'));
  });
}

export function remove() {
  token = null;
  if (userDefaults) {
    return new Promise(resolve => {
      userDefaults.remove('token', APP_GROUP_ID);
      resolve();
    });
  }
  return new Promise(resolve => {
    cookie.remove('token', { path: '/' });
    resolve();
  });
}

export function set(newToken) {
  token = newToken;
  if (userDefaults) {
    return new Promise(resolve => {
      userDefaults.set('token', newToken, APP_GROUP_ID);
      resolve();
    });
  }
  return new Promise(resolve => {
    cookie.set('token', token, { path: '/' });
    resolve();
  });
}
