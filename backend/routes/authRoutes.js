import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// REGISTER (Only Buyer or Owner Allowed)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ❌ Never allow Admin creation from API
    if (role === "Admin") {
      return res.status(403).json({
        message: "Admin cannot be registered"
      });
    }

    // ✅ Allow only Owner or Buyer
    const finalRole = role === "Owner" ? "Owner" : "Buyer";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      name,
      email,
      password,
      role: finalRole,   // backend decides role
      isApproved: false
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (user.role !== "Admin" && !user.isApproved) {
      return res.status(403).json({
        message: "Your account is waiting for Admin approval"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      userId:user._id
    });

  } catch (error) {
  console.error(error);
  res.status(500).json({
    message: "Login failed",
    error: error.message
  });
}

});

// GET USER PROFILE
router.get("/profile", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching profile",
      error: error.message
    });
  }
});

export default router;
