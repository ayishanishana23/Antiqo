import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { type: String, unique: true, required: true },

  password: { type: String, required: true },

  role: {
    type: String,
    enum: ["Admin", "Owner", "Buyer"],
    default: "Buyer"
  },
  isApproved: {
    type: Boolean,
    default: false   // Admin must approve
  }
}, { timestamps: true });


// ✅ Hash password before saving (ASYNC STYLE — no next())
userSchema.pre("save", async function () {

  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model("User", userSchema);
