const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mongoTestConfigPath = path.join(__dirname, './mongoTestConfig.json');

const mongod = new MongoMemoryServer({
  autoStart: false
});

module.exports = async () => {
  if (!mongod.isRunning) {
    await mongod.start();
  }

  const mongoUri = await mongod.getConnectionString();
  fs.writeFileSync(mongoTestConfigPath, JSON.stringify({ mongoUri }));

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = mongod;
};