import express from "express";
import Antique from "../models/Antique.js";
import OwnershipRequest from "../models/OwnershipRequest.js";
import { protect } from "../middleware/authMiddleware.js";
import { ownerOnly } from "../middleware/ownerMiddleware.js";
import upload from "../config/multer.js";

const router = express.Router();

// 🏺 REGISTER ANTIQUE
router.post(
  "/register",
  protect,
  ownerOnly,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "archaeologyCertificate", maxCount: 1 },
    { name: "labTestReport", maxCount: 1 },
    { name: "purchaseInvoice", maxCount: 1 },
    { name: "previousOwnershipProof", maxCount: 1 },
    { name: "images", maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        origin,
        manufactureDate,
        age,
        material,
        condition,
        historicalPeriod,
        estimatedValue,
        currency,
        tags
      } = req.body;

      const ownerId = req.user.id;

      /* ===== REQUIRED VALIDATION ===== */
      if (!name?.trim()) return res.status(400).json({ message: "Antique name is required" });
      if (!manufactureDate) return res.status(400).json({ message: "Manufacture date required" });
      if (!age) return res.status(400).json({ message: "Age required" });
      if (!req.files?.image) return res.status(400).json({ message: "Antique image is required" });

      /* ===== IMAGE URL ===== */
      const imageUrl = `/uploads/${req.files.image[0].filename}`;

      /* ===== MANUFACTURE DATE VALIDATION ===== */
      const manufactureDateValue = new Date(manufactureDate);
      if (isNaN(manufactureDateValue)) return res.status(400).json({ message: "Invalid manufacture date" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (manufactureDateValue > today) return res.status(400).json({ message: "Manufacture date cannot be in the future" });

      /* ===== AGE VALIDATION ===== */
      const currentYear = new Date().getFullYear();
      const manufactureYear = manufactureDateValue.getFullYear();
      const calculatedAge = currentYear - manufactureYear;
      if (Math.abs(calculatedAge - Number(age)) > 5) {
        return res.status(400).json({ message: "Age does not match manufacture date" });
      }

      /* ===== TAGS ===== */
      const tagArray = tags ? tags.split(",").map(t => t.trim()).filter(t => t.length > 0) : [];

      /* ===== DOCUMENTS ===== */
      const documents = {
        archaeologyCertificate: req.files.archaeologyCertificate?.[0] ? `/uploads/${req.files.archaeologyCertificate[0].filename}` : null,
        labTestReport: req.files.labTestReport?.[0] ? `/uploads/${req.files.labTestReport[0].filename}` : null,
        purchaseInvoice: req.files.purchaseInvoice?.[0] ? `/uploads/${req.files.purchaseInvoice[0].filename}` : null,
        previousOwnershipProof: req.files.previousOwnershipProof?.[0] ? `/uploads/${req.files.previousOwnershipProof[0].filename}` : null
      };

      /* ===== ADDITIONAL IMAGES ===== */
      const images = req.files.images?.map(file => `/uploads/${file.filename}`) || [];

      /* ===== CREATE ANTIQUE ===== */
      const newAntique = new Antique({
        name: name.trim(),
        owner: ownerId,
        description: description?.trim() || "",
        category: category || "",
        origin: origin || "",
        manufactureDate: manufactureDateValue,
        age: Number(age),
        material: material || "Unknown",
        condition: condition || "Good",
        historicalPeriod: historicalPeriod || "",
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
        currency: currency || "INR",
        tags: tagArray,
        imageUrl,
        documents,
        images,
        status: "Pending",
        currentOwnerId: ownerId
      });

      const savedAntique = await newAntique.save();

      return res.status(201).json({
        message: "Antique submitted for admin verification",
        antique: savedAntique
      });

    } catch (error) {
      console.error("REGISTER ERROR:", error);
      return res.status(500).json({
        message: "Error registering antique",
        error: error.message
      });
    }
  }
);

// Buyer: get all ownership requests made by buyer
router.get("/ownership-requests", protect, async (req, res) => {
  try {

    const requests = await OwnershipRequest.find({ buyer: req.user.id })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🏺 OWNER: GET MY ANTIQUES
router.get("/my-antiques", protect, async (req, res) => {
  try {
    const antiques = await Antique.find({ owner: req.user.id })
      .sort({ createdAt: -1 });

    res.json(antiques);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching your antiques"
    });
  }
});

// OWNER: MARK ANTIQUE FOR SALE
router.put("/list-for-sale/:id", protect, async (req, res) => {
  try {

    const antique = await Antique.findById(req.params.id);

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    // Check if logged-in user is the owner
    if (antique.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    // Only approved antiques can be sold
    if (antique.status !== "Approved")
      return res.status(400).json({ message: "Only approved antiques can be listed for sale" });

    antique.isForSale = true;

    await antique.save();

    res.json({ message: "Antique listed for sale successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error listing antique for sale" });
  }
});

// OWNER: REMOVE ANTIQUE FROM SALE
router.put("/remove-sale/:id", protect, async (req, res) => {
  try {

    const antique = await Antique.findById(req.params.id);

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    if (antique.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    antique.isForSale = false;

    await antique.save();

    res.json({ message: "Antique removed from sale" });

  } catch (error) {
    res.status(500).json({ message: "Error updating sale status" });
  }
});

//🏺 OWNER: DELETE OWN ANTIQUE (ONLY IF NOT APPROVED)
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const antique = await Antique.findById(req.params.id);

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    if (antique.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    if (antique.status === "Approved")
      return res
        .status(400)
        .json({ message: "Cannot delete approved antique" });

    await antique.deleteOne();

    res.json({ message: "Antique deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Delete failed"
    });
  }
});

// 📊 DASHBOARD: GET ANTIQUE COUNTS OF OWNER 
router.get("/stats", protect, async (req, res) => {
  try {
    const totalAntiques = await Antique.countDocuments();
    const pendingAntiques = await Antique.countDocuments({ status: "Pending" });
    const approvedAntiques = await Antique.countDocuments({ status: "Approved" });
    const rejectedAntiques = await Antique.countDocuments({ status: "Rejected" });

    res.json({
      totalAntiques,
      pendingAntiques,
      approvedAntiques,
      rejectedAntiques
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard stats"
    });
  }
});

// 🏺 BUYER: GET MY ANTIQUES
router.get("/my-antiques-buyer", protect, async (req, res) => {
  try {
    const buyerId = req.user.id;

    // Fetch all antiques where currentOwnerId is the buyer
    const antiques = await Antique.find({ currentOwnerId: buyerId })
      .populate("owner", "name email")            // current owner info
      .sort({ createdAt: -1 })                    // newest first
      .lean();                                    // convert to plain JS object

    // Format response like owner API, include previous owners
    const formatted = antiques.map(a => ({
      _id: a._id,
      name: a.name,
      description: a.description,
      category: a.category,
      origin: a.origin,
      age: a.age,
      material: a.material,
      condition: a.condition,
      historicalPeriod: a.historicalPeriod,
      estimatedValue: a.estimatedValue,
      currency: a.currency,
      imageUrl: a.imageUrl,
      qrCode: a.qrCode,
      serialId: a.serialId,
      txHash: a.txHash,
      blockchainId: a.blockchainId,
      blockchainVerified: a.blockchainVerified,
      status: a.status,
      verifiedAt: a.verifiedAt,
      owner: a.owner,                            // current owner info
      previousOwners: a.previousOwners || []     // previous owners history
    }));

    res.json(formatted);

  } catch (err) {
    console.error("BUYER ANTIQUES ERROR:", err);
    res.status(500).json({ message: "Error fetching your antiques" });
  }
});



// Get all antiques or search by query
// GET /api/antique/browse?q=...
router.get("/browse", protect, async (req, res) => {
  try {

    const q = req.query.q;

    let filter = { status: "Approved" };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { material: { $regex: q, $options: "i" } },
        { origin: { $regex: q, $options: "i" } },
        { historicalPeriod: { $regex: q, $options: "i" } }
      ];
    } else {
      filter.isForSale = true;   // ONLY FOR SALE initially
    }

    const antiques = await Antique.find(filter)
      .populate("owner", "name");

    const result = antiques.map(a => ({
      _id: a._id,
      name: a.name,
      serialId: a.serialId,
      imageUrl: a.imageUrl,
      qrCode: a.qrCode,
      ownerName: a.owner?.name,
      isForSale: a.isForSale
    }));

    res.json(result);

  } catch (err) {
    res.status(500).json({ message: "Browse error" });
  }
});

// 🔎 PUBLIC VERIFICATION BY SERIAL ID
router.get("/verify/:serialId", async (req, res) => {
  try {

    const antique = await Antique.findOne({
      serialId: req.params.serialId
    }).populate("owner", "name").populate("previousOwners.owner", "name").lean();

    if (!antique) {
      return res.status(404).json({
        message: "Antique not found"
      });
    }

    // Only allow verification of approved antiques
    if (antique.status !== "Approved") {
      return res.status(403).json({
        message: "Antique is not verified yet"
      });
    }

    res.json({

      /* Antique Details */
      name: antique.name,
      description: antique.description,
      category: antique.category,
      origin: antique.origin,
      age: antique.age,
      estimatedValue: antique.estimatedValue,
      currency: antique.currency,
      material: antique.material,
      condition: antique.condition,
      historicalPeriod: antique.historicalPeriod,

      /* Verification Info */
      serialId: antique.serialId,
      status: antique.status,
      blockchainVerified: antique.blockchainVerified,

      /* Image + QR */
      imageUrl: antique.imageUrl,
      qrCode: antique.qrCode,

      /* Blockchain Info */
      blockchainId: antique.blockchainId,
      txHash: antique.txHash,

      /* Current Owner */
      currentOwner: antique.owner?.name || "Unknown",

      /* Ownership History */
      previousOwners: antique.previousOwners,

      verifiedAt: antique.verifiedAt

    });

  } catch (error) {

    console.error("VERIFY ERROR:", error);

    res.status(500).json({
      message: "Error verifying antique"
    });

  }
});

// Public verification API
router.get("/public/:serialId", async (req, res) => {
  try {
    const antique = await Antique.findOne({ serialId: req.params.serialId })
      .populate("owner", "name")
      .populate("previousOwners.owner", "name")
      .lean();

    if (!antique) return res.status(404).json({ message: "Antique not found" });

    if (antique.status !== "Approved")
      return res.status(403).json({ message: "Antique is not verified yet" })
    // Send only public details + verification info
    res.json({
      name: antique.name,
      category: antique.category,
      origin: antique.origin,
      age: antique.age,
      estimatedValue: antique.estimatedValue || "-",
      currency: antique.currency,
      description: antique.description,
      imageUrl: antique.imageUrl,
      qrCode: antique.qrCode,
      serialId: antique.serialId,
      status: antique.status,
      isForSale: antique.isForSale,
      blockchainId: antique.blockchainId,
      txHash: antique.txHash,
      blockchainVerified: antique.blockchainVerified,
      currentOwner: antique.owner?.name || "Unknown",
      ownerId: antique.owner?._id,
      previousOwners: antique.previousOwners || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching antique details" });
  }
});


// POST /api/antique/request-ownership
router.post("/request-ownership", protect, async (req, res) => {


  if (req.user.role !== "Buyer") {
    return res.status(403).json({ message: "Only buyers can request ownership" });
  }

  const { serialId } = req.body;
  const buyerId = req.user.id;

  try {

    const antique = await Antique
      .findOne({ serialId })
      .populate("owner", "name email");

    if (!antique)
      return res.status(404).json({ message: "Antique not found" });

    // Prevent owner requesting their own antique
    if (antique.owner._id.toString() === buyerId)
      return res.status(400).json({ message: "You already own this antique" });

    // Check existing request
    const existing = await OwnershipRequest.findOne({
      antique: antique._id,
      buyer: buyerId,
      status: { $in: ["PendingOwner", "PendingAdmin"] }
    });

    if (existing)
      return res.status(400).json({ message: "Ownership request already sent" });

    // Create request
    const request = await OwnershipRequest.create({
      antique: antique._id,
      buyer: buyerId,
      owner: antique.owner._id,
      status: "PendingOwner"
    });

    res.json({
      message: "Ownership request sent to owner",
      requestId: request._id
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Error sending ownership request"
    });

  }

});

router.get("/my-ownership-requests", protect, async (req, res) => {

  try {

    const requests = await OwnershipRequest.find({
      buyer: req.user.id
    })
      .populate("antique", "name serialId")
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Error loading requests" });

  }

});
// GET /api/antique/owner-requests
router.get("/owner-requests", protect, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const requests = await OwnershipRequest
      .find({ owner: ownerId, status: "PendingOwner" })
      .populate("antique", "name serialId")
      .populate("buyer", "name email")
      .sort({ requestDate: -1 });

    res.json(requests);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading ownership requests" });
  }
});



// POST /api/ownership-request/owner-response
router.post("/ownership-request/owner-response", protect, async (req, res) => {
  const { requestId, approve } = req.body;

  try {
    const request = await OwnershipRequest.findById(requestId).populate("antique owner buyer");
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.owner._id.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    request.status = approve ? "PendingAdmin" : "Rejected";
    request.ownerResponseDate = new Date();
    await request.save();

    // Optionally: notify buyer
    res.json({ message: `Request ${approve ? "approved" : "rejected"} by owner` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error responding to request" });
  }
});


router.get("/approved", async (req, res) => {
  try {
    // Fetch all antiques with status "Approved"
    const approvedAntiques = await Antique.find({ status: "Approved" })
      .select("name  imageUrl");
    // Select only fields needed for public display

    res.json(approvedAntiques);
  } catch (error) {
    console.error("Error fetching approved antiques:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
