import mongoose from "mongoose";

const ownershipRequestSchema = new mongoose.Schema({

  antique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Antique",
    required: true
  },

  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["PendingOwner", "PendingAdmin", "Approved", "Rejected"],
    default: "PendingOwner"
  },

  requestDate: {
    type: Date,
    default: Date.now
  },

  ownerResponseDate: Date,
  adminResponseDate: Date

});

export default mongoose.model("OwnershipRequest", ownershipRequestSchema);