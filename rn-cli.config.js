const blacklist = require('metro/src/blacklist');

module.exports = {
  getBlacklistRE() {
    return blacklist([
      /server\/.*/,
      /app\/web\/.*/,
      /\.env/,
      /publicenv/,
      /react-native\/local-cli\/core\/__fixtures__\/files.*/
    ]);
  }
};
