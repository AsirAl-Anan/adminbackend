import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const drivingLicenseSchema = new mongoose.Schema({
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
    image: [
        {
            url: {
                type: String,
                validate: {
                    validator: v => !v || /^https?:\/\/\.+/.test(v),
                    message: "Invalid Driving License Image URL"
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

const DrivingLicense = academicDb.model("DrivingLicense", drivingLicenseSchema, "employee.drivingLicense");

export default DrivingLicense;