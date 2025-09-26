import User from "../models/user.model.js";
import genToken from "../utils/token.js";

export const signUp = async (req, res) => {
  try {
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

