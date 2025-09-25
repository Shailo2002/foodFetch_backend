import mongoose from "mongoose";

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Database connected");
  } catch (e) {
    console.log("Database connection error");
  }
};

export default connectDb;
