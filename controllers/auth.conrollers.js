import User from "../models/user.model.js";
import { sendOtpMail } from "../utils/mail.js";
import genToken from "../utils/token.js";
import bcrypt from "bcryptjs";

export const signUp = async (req, res) => {
  try {
    console.log("signup endpoint");

    const { fullName, password, email, mobile, role } = req.body;
    let user = await User.findOne({ email });

    if (user) {
      res.status(400).json({
        message: "User aready exist",
      });
    }
    if (password.length < 6) {
      res.status(400).json({
        message: "password must be atleast 6 characters",
      });
    }
    if (mobile.length < 10) {
      res.status(400).json({
        message: "mobile number must be atleast 10 digits.",
      });
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    user = await User.create({
      fullName,
      password: hashedpassword,
      email,
      mobile,
      role,
    });

    const token = genToken(user._id);

    res.cookie("token", token, {
      sameSite: "strict",
      secure: false,
      maxAge: 7 * 24 * 3600 * 1000,
      httpOnly: true,
    });

    return res.status(201).json(user);
  } catch (e) {
    res.status(500).json({
      message: "sign up error",
    });
  }
};

export const signIn = async (req, res) => {
  try {
    console.log("Signin endpoint");
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({
        message: "User not exist",
      });
    }

    const password_verify = await bcrypt.compare(password, user.password);

    if (!password_verify) {
      res.status(400).json({
        message: "incorrect password",
      });
    }

    const token = genToken(user._id);

    res.cookie("token", token, {
      sameSite: "strict",
      secure: false,
      maxAge: 7 * 24 * 3600 * 1000,
      httpOnly: true,
    });

    return res.status(201).json(user);
  } catch (e) {
    res.status(500).json({
      message: "sign in error",
    });
  }
};

export const signOut = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "logout successfully" });
  } catch (error) {
    res.status(500).json({
      message: "sign out error",
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    console.log("sendotp endpoint");

    const { email } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: "User not exist",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.isOtpVerified = false;
    await user.save();
    await sendOtpMail({ to: email, otp });

    return res.status(200).json({ message: "Otp sent successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Otp generation error",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    console.log("verify otp endpoint");
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: "User not exist",
      });
    }

    if (user.resetOtp != otp || user.otpExpires < Date.now()) {
      res.status(400).json({
        message: "invalid/expired Otp",
      });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();
    return res.status(200).json({ message: "Otp verify successfully" });
  } catch (error) {
    res.status(500).json({
      message: "verify otp error",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    console.log("reset password checkpoint");
    const { newpassword, email } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: "User does not exist",
      });
    }
    if (newpassword.length < 6) {
      res.status(400).json({
        message: "password must be atleast 6 characters",
      });
    }
    if (!user.isOtpVerified) {
      res.status(400).json({
        message: "otp verification required",
      });
    }

    const hashedpassword = await bcrypt.hash(newpassword, 10);

    user.password = hashedpassword;
    console.log(hashedpassword);
    await user.save();

    return res.status(200).json({ message: "password reset successfully" });
  } catch (e) {
    res.status(500).json({
      message: "password reset error",
    });
  }
};
