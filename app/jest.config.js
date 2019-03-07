// TODO - move this stuff to setup file?
require('./publicenv.js');

process.env.WEB = 'true';
process.env.BROWSER = 'true';

module.exports = {
  displayName: 'App',
  rootDir: '../',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/server/'],
  preset: '<rootDir>node_modules/react-native-web',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': '<rootDir>/node_modules/babel-jest',
    '^[./a-zA-Z0-9$_-]+\\.(bmp|gif|jpg|jpeg|png|psd|svg|webp)$':
      '<rootDir>/__mocks__/fileTransformer.js'
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx)$'],
  // for some react-native-web aliasing is causing a
  // console / 'canvas' error - this mocks canvas as a solution
  setupFilesAfterEnv: ['<rootDir>/app/jest.setup.js'],
  setupFiles: ['jest-canvas-mock', '<rootDir>/node_modules/regenerator-runtime/runtime']
};
