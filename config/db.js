import mongoose from "mongoose";

const connectDb = async () => {
  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required");
  await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 10000 });
  console.log("Database connected");
};

export default connectDb;
