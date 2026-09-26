const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/duster';
  try {
    // Attempt standard connection first with 3s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected to database at: ${uri}`);
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to local/specified Mongo at ${uri}.`);
    console.log('[MongoDB] Starting automated in-memory MongoDB instance for seamless local dev...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[MongoDB] Connected to in-memory instance at: ${memUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Failed to start in-memory Mongo:', memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
