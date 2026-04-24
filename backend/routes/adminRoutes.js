import express from "express";
import QRCode from "qrcode";
import User from "../models/User.js";
import Antique from "../models/Antique.js";
import OwnershipRequest from "../models/OwnershipRequest.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import { registerAntiqueOnBlockchain } from "../blockchain/blockchain.js";
import { transferOwnershipOnBlockchain } from "../blockchain/blockchain.js";



const router = express.Router();

// 🔐 All routes below require Admin
router.use(protect, adminOnly);

/* ============================================================
   👤 USER MANAGEMENT
============================================================ */

// ✅ Get Users Waiting for Approval
router.get("/pending-users", async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["Owner", "Buyer"] },
      isApproved: false
    });
    res.json(users);
  } catch {
    res.status(500).json({ message: "Error fetching pending users" });
  }
});

// ✅ Approve Owner / Buyer
router.put("/approve-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "Admin")
      return res.status(403).json({ message: "Cannot approve Admin" });
    if (user.isApproved)
      return res.status(400).json({ message: "User already approved" });

    user.isApproved = true;
    await user.save();

    res.json({ message: "User approved successfully", user });
  } catch {
    res.status(500).json({ message: "Approval failed" });
  }
});

// ❌ Reject User
router.delete("/reject-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "Admin")
      return res.status(403).json({ message: "Cannot delete Admin" });
    if (user.isApproved)
      return res
        .status(400)
        .json({ message: "Use delete-user for approved users" });

    await user.deleteOne();
    res.json({ message: "User rejected and removed" });
  } catch {
    res.status(500).json({ message: "Rejection failed" });
  }
});

// ✅ Get All Approved Users
router.get("/approved-users", async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["Owner", "Buyer"] },
      isApproved: true
    });
    res.json(users);
  } catch {
    res.status(500).json({ message: "Error fetching approved users" });
  }
});

// 🗑 Delete Approved User
router.delete("/delete-user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "Admin")
      return res.status(403).json({ message: "Admin cannot be deleted" });

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

// 📊 Get Users Grouped by Role
router.get("/users-by-role", async (req, res) => {
  try {
    const owners = await User.find({ role: "Owner", isApproved: true });
    const buyers = await User.find({ role: "Buyer", isApproved: true });

    res.json({ owners, buyers });
  } catch {
    res.status(500).json({ message: "Error grouping users" });
  }
});

/* ============================================================
   🏺 ANTIQUE MANAGEMENT
============================================================ */

// ✅ Get Pending Antiques
router.get("/pending-antiques", async (req, res) => {
  try {

    const antiques = await Antique.find({ status: "Pending" })
      .populate("owner", "name email")
      .select(
        "name description category origin manufactureDate age material condition historicalPeriod estimatedValue currency tags imageUrl images documents owner"
      );

    res.json(antiques);

  } catch (err) {

    console.error("Pending antiques error:", err);

    res.status(500).json({
      message: "Error fetching antiques"
    });

  }
});

// ✅ Get Approved Antiques
router.get("/approved-antiques", async (req, res) => {
  try {
    const antiques = await Antique.find({ status: "Approved" })
      .populate("owner", "name email");

    res.json(antiques);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch approved antiques" });
  }
});

/* ============================================================
   ✅ ADMIN APPROVES ANTIQUE
   SERIAL + BLOCKCHAIN + PUBLIC VERIFICATION QR + DB UPDATE
============================================================ */

router.put("/verify-antique/:id", async (req, res) => {
  try {
    const antique = await Antique.findById(req.params.id)
      .populate("owner");

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    if (antique.status === "Approved")
      return res.status(400).json({ message: "Already approved" });

    /* ===== GENERATE SERIAL ID ===== */
    const count = await Antique.countDocuments({ status: "Approved" });
    const serialId =
      "ANTQ-" +
      new Date().getFullYear() +
      "-" +
      String(count + 1).padStart(5, "0");

    // Ensure serial ID is unique
    const exists = await Antique.findOne({ serialId });
    if (exists) throw new Error("Serial ID conflict");

    /* ===== STORE ON BLOCKCHAIN ===== */
    const { blockchainId, txHash } = await registerAntiqueOnBlockchain(
      serialId,
      antique.name,
      antique.owner._id.toString(),
      antique.manufactureDate ? antique.manufactureDate.toISOString() : "",
      antique.material || ""
    );

    /* ===== GENERATE PUBLIC VERIFICATION URL ===== */
    
const NGROK_URL = "https://nonpalpably-speculative-londyn.ngrok-free.dev";
// Correct URL for verification page
const verifyURL = `${NGROK_URL}/verifyAntique.html?id=${serialId}`;
// Generate QR code
const qrCodeImage = await QRCode.toDataURL(verifyURL);
// You can now use qrCodeImage as src in <img>
console.log(qrCodeImage);

    /* ===== UPDATE DATABASE ===== */
    antique.status = "Approved";
    antique.serialId = serialId;
    antique.blockchainId = blockchainId;
    antique.txHash = txHash;
    antique.blockchainVerified = true;
    antique.qrCode = qrCodeImage;
    antique.verifiedBy = req.user.id;
    antique.verifiedAt = new Date();

    await antique.save();

    res.json({
      message: "Antique approved, blockchain stored, QR generated",
      antique
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Approval failed" });
  }
});

/* ============================================================
   ❌ Reject Antique
============================================================ */

router.put("/reject-antique/:id", async (req, res) => {
  try {

    const { reason } = req.body;
    const antique = await Antique.findById(req.params.id);

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    antique.status = "Rejected";
    antique.rejectionReason = reason || "Rejected by admin";

    await antique.save();

    res.json({ message: "Antique rejected", antique });

  } catch {
    res.status(500).json({ message: "Antique rejection failed" });
  }
});

router.delete("/delete-antique/:id", async (req, res) => {
  try {

    const antique = await Antique.findById(req.params.id);

    if (!antique) {
      return res.status(404).json({ message: "Antique not found" });
    }

    await antique.deleteOne();

    res.json({
      message: "Antique deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
});

// GET /api/admin/pending-ownership-requests
router.get("/pending-ownership-requests", protect, async (req, res) => {

  try {

    if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Admin access required" });

    const requests = await OwnershipRequest
      .find({ status: "PendingAdmin" })
      .populate("antique", "name serialId owner")
      .populate("buyer", "name email")
      .populate("owner", "name email")
      .sort({ requestDate: -1 });

    res.json(requests);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Error loading requests" });

  }

});

// POST /api/ownership-request/admin-response
router.post("/ownership-request/admin-response", protect, async (req, res) => {

  const { requestId, approve } = req.body;

  try {

    if (req.user.role !== "Admin")
      return res.status(403).json({ message: "Admin access required" });

    const request = await OwnershipRequest
      .findById(requestId)
      .populate("antique")
      .populate("owner", "name")
      .populate("buyer", "name");


    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const antique = await Antique.findById(request.antique._id);

    if (!approve) {

      request.status = "Rejected";
      request.adminResponseDate = new Date();
      await request.save();

      return res.json({ message: "Request rejected by admin" });

    }
// Save previous owner
antique.previousOwners.push({
  owner: request.owner._id,
  transferDate: new Date()
});

// Transfer ownership
antique.owner = request.buyer._id;

// Blockchain transaction
const blockchainResult = await transferOwnershipOnBlockchain(
  antique.serialId,
  request.buyer._id.toString()
);

antique.txHash = blockchainResult.txHash;

await antique.save();

    request.status = "Approved";
    request.adminResponseDate = new Date();

    await request.save();

    res.json({
      message: "Ownership transferred successfully",
      txHash: blockchainResult.txHash
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Error processing admin approval"
    });

  }

});



export default router;