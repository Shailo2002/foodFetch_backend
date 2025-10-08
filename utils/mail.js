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

export const sendDeliveryOtpMail = async ({
  to,
  otp,
  shopOrderId,
  userName,
}) => {
  try {
    const info = await transporter.sendMail({
      from: `"FoodFetch" <${process.env.EMAIL}>`,
      to,
      subject: "Your Delivery OTP",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
          <h3>Hello ${userName},</h3>
          <p>Your order <strong>#${shopOrderId}</strong> is almost there!</p>
          <p>Please share this code with your delivery partner to complete your delivery:</p>
          <h1 style="color:#007bff; letter-spacing:2px;">${otp}</h1>
          <p style="font-size: 0.9em; color:#777;">This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log("✅ Delivery OTP email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending delivery OTP mail:", err);
  }
};
