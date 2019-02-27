// This is needed for android
// may not be needed in future versions
// https://github.com/facebook/react-native/issues/20902
// require('@babel/polyfill');

const { AppRegistry } = require('react-native');
const App = require('./app/modules/_app/mobile/app.index');
const Share = require('./app/modules/_app/mobile/share.index');

AppRegistry.registerComponent('relevantNative', () => App);
AppRegistry.registerComponent('Relevant', () => Share);
