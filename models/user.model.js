import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  mobile: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "owner", "delivery_boy"],
    required: true,
  },
  resetOtp: {
    type: String,
  },
  isOtpVerified: {
    type: Boolean,
    default: false,
  },
  otpExpires: {
    type: Date,
  },
  socketId: {
    type: String,
  },
  isOnline:{
    type:Boolean,
    default:false
  },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
});

UserSchema.index({ location: "2dsphere" });

const User = mongoose.model("User", UserSchema);
export default User;
