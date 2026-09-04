import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const mongodbUri = process.env.MONGODB_URI;

async function start() {
    if (mongodbUri === undefined || mongodbUri === "") {
        console.error("MONGODB_URI is not set");
        process.exit(1);
    }
    try {
        await mongoose.connect(mongodbUri);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
        process.exit(1);
    }
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

start();
