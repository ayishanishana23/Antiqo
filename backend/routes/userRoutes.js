import express from "express";
import User from "../models/User.js";
import Antique from "../models/Antique.js";
import OwnershipRequest from "../models/OwnershipRequest.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

// Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if(existingUser) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ name, email, password, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
});

/* DELETE OWN ACCOUNT */
router.delete("/delete", protect, async (req, res) => {
  try {
    console.log("DELETE API HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password"
      });
    }

    // delete related data
    await Antique.deleteMany({ owner: userId });

    await OwnershipRequest.deleteMany({
      $or: [{ buyer: userId }, { owner: userId }]
    });

    await user.deleteOne();

    res.json({
      success: true,
      message: "Account deleted successfully"
    });

  } catch (err) {
    console.error("DELETE ERROR:", err); // 🔥 VERY IMPORTANT
    res.status(500).json({
      success: false,
      message: "Delete failed"
    });
  }
});
export default router;
