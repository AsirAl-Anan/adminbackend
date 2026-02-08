import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const deviceSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        default: "",
    },
    hwId: {
        type: String,
        default: "",
        unique: true
    },
    deviceType: {
        type: String,
        enum: ["web", "mobile", "tablet", "desktop", "other"],
        default: "web"
    },
    // deviceLogs: [employeeLogSchema],
    ip: {
        type: String,
        default: ""
    },
    loggedInAt: {
        type: Date,
        default: null
    },
    loggedOutAt: {
        type: Date,
        default: null
    },
    lastActiveAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const employeeLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now()
    },
    device: deviceSchema,

    resourceType: {
        type: String,
        enum: [
            "ACCOUNT",
            "PASSWORD",
            "CONTENT",
            "PRODUCT",
            "TECHNOLOGY",
            "OTHERS"
        ],
        required: true
    },
    actionType: {
        type: String,
        enum: ["create", "update", "delete", "login", "logout", "other"],
        required: true
    },

    messageType: {
        type: String,
        enum: ["info", "success", "warning", "error", "other"],
        required: true
    },
    message: {
        type: String,
        required: true
    }
}, { _id: false });

const employeeHistorySchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },

    lastLoginAt: {
        type: Date,
        default: Date.now()
    },

    lastLogoutAt: {
        type: Date,
        default: null
    },

    failedLoginAttempts: {
        type: Number,
        default: 0
    },

    lastPasswordChangedAt: {
        type: Date,
        default: null
    },

    passwordHistory: [
        {
            password: {
                type: String,
                select: false
            },
            startedAt: {
                type: Date,
                default: null
            },
            changedAt: {
                type: Date,
                default: null
            },
            changer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Employee"
            }
        }, { default: [] }
    ],

    isLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: Date,

    deviceHistory: [deviceSchema],
    employeeLogs: [employeeLogSchema]

}, { timestamps: true });

const EmployeeHistory = academicDb.model("EmployeeHistory", employeeHistorySchema, "employee.history");

export default EmployeeHistory;