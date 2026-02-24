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

const roleSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["Employee", "SuperEmployee", "Staff", "Viewer", "Editor"],
    default: "Staff"
  },
  permissions: {
    type: [permissionSchema],
    default: []
  },
  permissionLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
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
  roles: {
    type: [roleSchema],
    default: []
  },
  customPermissions: {
    type: [permissionSchema],
    default: []
  }
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    // required: true,
    unique: true,
    trim: true,
    minlength: 5,
    maxlength: 10
  },

  username: {
    type: String,
    // required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
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

  identityIDs: {
    nid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NID",
      default: null,
      select: false
    },
    passport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Passport",
      default: null,
      select: false
    },
    drivingLicense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrivingLicense",
      default: null,
      select: false
    },
    birthCertificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BirthCertificate",
      default: null,
      select: false
    }
  },

  identityVerificationSummary: {
    type: String,
    enum: ["UNVERIFIED", "PARTIAL", "VERIFIED"],
    default: "UNVERIFIED"
  },

  nickname: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 20
  },

  contacts: {
    phones: [
      {
        type: String,
        trim: true,
        minlength: 11,
        maxlength: 11,
        validate: {
          validator: v => /^01\d{9}$/.test(v),
          message: "Invalid phone number"
        }
      }, { default: [] }
    ],
    emergencyContact: {
      type: String,
      trim: true,
      minlength: 11,
      maxlength: 11,
      validate: {
        validator: v => /^01\d{9}$/.test(v),
        message: "Invalid phone number"
      }
    },
    socialLinks: [
      {
        socialType: {
          type: String,
          enum: ["LinkedIn", "GitHub", "Facebook", "Twitter", "Instagram", "Others"],
          default: ""
        },
        socialLink: {
          type: String,
          trim: true,
          minlength: 3,
          maxlength: 50
        },
        username: {
          type: String,
          trim: true,
          minlength: 3,
          maxlength: 50
        }
      }, { default: [] }
    ]
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

  employeeHistory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmployeeHistory",
    default: null
  },

  metadata: metadataSchema,

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null
  }

}, { timestamps: true });

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // if (this.password) {
  //   this.employeeHistory.passwordHistory.push({
  //     password: this.password,
  //     startedAt: this.employeeHistory.lastPasswordChangedAt,
  //     changedAt: Date.now(),
  //     changer: this._id
  //   });
  // }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // this.employeeHistory.lastPasswordChangedAt = Date.now();

  // DEVICE DETECTION????

  // this.employeeHistory.employeeLogs.push({
  //   timestamp: Date.now(),
  //   device: "",
  //   resourceType: "PASSWORD",
  //   actionType: "update",
  //   messageType: "info",
  //   message: "Password updated at " + Date.now()
  // });

  next();
});

employeeSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

const Employee = academicDb.model('Employee', employeeSchema)
export default Employee
