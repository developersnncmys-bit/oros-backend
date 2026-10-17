import mongoose from "mongoose";

// On serverless, each cold start would otherwise open a new pool and
// quickly exhaust Atlas's connection cap. Cache the promise on globalThis
// so warm invocations reuse the same connection.
let cached = globalThis.__mongoose;
if (!cached) {
    cached = globalThis.__mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGO_URI, {
                dbName: process.env.MONGO_DB_NAME || "oros",
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            })
            .then((m) => {
                console.log("✅ mongoDB connected");
                return m;
            })
            .catch((error) => {
                cached.promise = null;
                console.error("❌ mongoDB connection failed :", error.message);
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

export default connectDB;
