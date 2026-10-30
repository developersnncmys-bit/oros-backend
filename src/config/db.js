import mongoose from "mongoose";

// On serverless, each cold start would otherwise open a new pool and
// quickly exhaust Atlas's connection cap. Cache the promise on globalThis
// so warm invocations reuse the same connection.
let cached = globalThis.__mongoose;
if (!cached) {
    cached = globalThis.__mongoose = { conn: null, promise: null };
}

// One-time cleanup: the addresses collection used to carry a unique
// index on `user` (one address per user). The multi-address rewrite
// dropped that constraint from the schema, but Mongo keeps the index
// until we remove it explicitly — otherwise the second address a user
// creates fails with E11000. Safe to run every boot: dropIndex is a
// no-op after the first success.
const dropLegacyAddressUserIndex = async () => {
    try {
        await mongoose.connection
            .collection("addresses")
            .dropIndex("user_1");
    } catch (error) {
        if (
            error?.codeName !== "IndexNotFound" &&
            !/index not found/i.test(error?.message || "")
        ) {
            console.warn(
                "⚠️ could not drop legacy addresses.user_1 index:",
                error.message
            );
        }
    }
};

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGO_URI, {
                dbName: process.env.MONGO_DB_NAME || "oros",
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            })
            .then(async (m) => {
                console.log("✅ mongoDB connected");
                await dropLegacyAddressUserIndex();
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
