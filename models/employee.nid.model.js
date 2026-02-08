import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const nidSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    number: {
        type: String,
        trim: true,
        minlength: 10,
        maxlength: 10,
        unique: true
    },
    nidType: {
        type: String,
        enum: ["SmartCard", "OldNID"],
        default: "SmartCard"
    },
    image: [
        {
            url: {
                type: String,
                validate: {
                    validator: v => !v || /^https?:\/\/\.+/.test(v),
                    message: "Invalid NID Image URL"
                }
            },
            direction: {
                type: String,
                enum: ["front", "back"],
                default: "front"
            }
        }
    ],
    isVerified: {
        type: Boolean,
        default: false
    }
})

const NID = academicDb.model("NID", nidSchema, "employee.nid");

export default NID;