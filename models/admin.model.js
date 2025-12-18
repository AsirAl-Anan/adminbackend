import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { academicDb } from "../config/db.config.js";


const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    enum: [
      "ALL",
      "CONTENT",
      "PRODUCT",
      "TECHNOLOGY",
      "MARKETING",
      "FINANCE",
      "HR",
      "OTHERS",
      "NONE"
    ],
    required: true
  },
  actions: {
    type: [String], 
    enum: ["view", "edit", "delete", "add"],
    default: []
  }
}, { _id: false });

const metadataSchema = new mongoose.Schema({
  designations: {
    type: [String],
    enum: [
      "CEO",
      "CTO",
      "CFO",
      "COO",
      "FOUNDER",
      "CO-FOUNDER",
      "STAFF",
      "ADMIN",
      "SUPERADMIN"
    ],
    default: []
  },
  department: {
    type: [String],
    enum: [
      "CONTENT",
      "PRODUCT",
      "TECHNOLOGY",
      "MARKETING",
      "FINANCE",
      "HR",
      "OTHERS",
      "NONE"
    ],
    default: ["NONE"]
  },
  permissions: {
    type: [permissionSchema],
    default: []
  }
}, { _id: false });

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 5,
    maxlength: 50
  },

  password: {
    type: String,
    required: true,
    select: false,
    minlength: 6
  },

  fullname: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 50
  },

  nickname: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 20
  },

  avatar: {
    type: String,
    trim: true,
    default: "",
    validate: {
      validator: v => !v || /^https?:\/\/.+/.test(v),
      message: "Invalid avatar URL"
    }
  },

  roles: {
    type: [String],
    enum: ["Admin", "SuperAdmin", "Staff", "Viewer", "Editor"],
    default: ["Staff"]
  },
  others:{
    failedLoginAttempts: {
        type:Number,
        default:0
    },
    device:{
        type:String,
        default:""
    },
    ip:{
        type:String,
        default:""
    },
    lastLoginAt:{
        type:Date,
        default:Date.now()
    },
    lastLogoutAt:{
        type:Date,
        default:Date.now()
    }
  },
  metadata: metadataSchema,

  isActive: {
    type: Boolean,
    default: true
  },

  lastLoginAt: Date

}, { timestamps: true });

adminSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password, this.password)
}

 const Admin = academicDb.model('Admin',adminSchema)
 export default Admin
