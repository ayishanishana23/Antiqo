import mongoose from "mongoose";

const antiqueSchema = new mongoose.Schema(
{
  // Antique Name
  name:{
    type:String,
    required:[true,"Antique name is required"],
    trim:true
  },

  // Owner reference
  owner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true
  },

  // Antique description
  description:{
    type:String
  },

  // Category
  category:{
    type:String
  },

  // Historical Details
  origin:{
    type:String
  },

  age:{
    type:Number
  },

  manufactureDate:{
    type:Date
  },

  historicalPeriod:{
    type:String
  },

  // Physical Details
  material:{
    type:String
  },

  condition:{
    type:String,
    enum:["Excellent","Good","Fair","Damaged"],
    default:"Good"
  },

  // Pricing
  estimatedValue:{
    type:Number
  },

  currency:{
    type:String,
    default:"INR"
  },

  // Image (Uploaded using Multer)
  imageUrl:{
    type:String,
    required:[true,"Antique image is required"]
  },
 
documents: {
  archaeologyCertificate: {
    type: String
  },
  labTestReport: {
    type: String
  },
  purchaseInvoice: {
    type: String
  },
  previousOwnershipProof: {
    type: String
  }
},

images: [
  {
    type: String
  }
],


isForSale: {
  type: Boolean,
  default: false
},
  // Unique Serial ID (generated during admin approval)
  serialId:{
    type:String,
    unique:true,
    sparse:true,
  },

  // QR Code image
  qrCode:{
    type:String,
    default:null
  },

  // Blockchain Information
  blockchainId:{
    type:String,
    default:null
  },

  txHash:{
    type:String,
    default:null
  },

  blockchainVerified:{
    type:Boolean,
    default:false
  },

  // Ownership History
 previousOwners:[
{
  owner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  },
  transferDate:Date
}
],

  // Admin Verification
  status:{
    type:String,
    enum:["Pending","Approved","Rejected"],
    default:"Pending"
  },

  verifiedBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  },

  verifiedAt:{
    type:Date
  },

  adminRemarks:{
    type:String
  },

  rejectionReason:{
    type:String,
    default:null
  },

  // Search / AI Tags
  tags:[
    String
  ]

},
{ timestamps:true }
);

export default mongoose.model("Antique", antiqueSchema);