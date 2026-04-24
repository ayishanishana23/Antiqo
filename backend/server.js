import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import antiqueRoutes from "./routes/antiqueRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

console.log("JWT SECRET:", process.env.JWT_SECRET);


const app = express();
app.use(cors());
app.use(express.json());

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));
//Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/antique", antiqueRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/verifyAntique.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/verifyAntique.html"));
});

// Optional: open welcome page on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
