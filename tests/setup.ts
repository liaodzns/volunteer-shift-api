import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
  
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});