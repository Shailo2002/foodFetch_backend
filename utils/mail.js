import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true, // use STARTTLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpMail = async ({ to, otp }) => {
  try {
    const info = await transporter.sendMail({
      from: `"FoodFetch" <${process.env.EMAIL}>`,
      to,
      subject: "Your OTP to Reset Password",
      html: `
    <p>Hello!</p>
    <p>We received a request to reset your password.</p>
    <p>Your OTP is:
    <h2 style="color:#007bff;">${otp}</h2></p>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you didn’t request this, just ignore this email.</p>
  `,
    });
  } catch (err) {
    console.error("❌ Error sending mail:", err);
  }
};
