import User from "../models/user.model.js";
import { sendOtpMail } from "../utils/mail.js";
import genToken from "../utils/token.js";
import bcrypt from "bcryptjs";

export const signUp = async (req, res) => {
  try {
    console.log("signup endpoint");

    const { fullName, password, email, mobile, role } = req.body;

    if (!fullName || !password || !email || !mobile || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (mobile.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be at least 10 digits",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      mobile,
      role,
    });

    const token = await genToken(user._id);

    res.cookie("token", token, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const signIn = async (req, res) => {
  try {
    console.log("signin endpoint");

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during signin",
    });
  }
};

export const signOut = async (req, res) => {
  try {
    console.log("signout endpoint check");
    res.clearCookie("token");
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Signout error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during sign out",
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    console.log("sendotp endpoint");

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.isOtpVerified = false;
    await user.save();

    await sendOtpMail({ to: email, otp });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    console.log("verify otp endpoint");
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.resetOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during OTP verification",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    console.log("reset password endpoint");
    const { newPassword, email } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isOtpVerified) {
      return res.status(403).json({
        success: false,
        message: "OTP verification required before resetting password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isOtpVerified = false; // reset after successful password change
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during password reset",
    });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { fullName, email, mobile, role } = req.body;
    console.log("google auth endpoint");

    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName,
        email,
        mobile,
        role: role || "user",
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Google authentication",
    });
  }
};
