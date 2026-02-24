import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const birthCertificateSchema = new mongoose.Schema({
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
    image: {
        url: {
            type: String,
            validate: {
                validator: v => !v || /^https?:\/\/.+/.test(v),
                message: "Invalid Birth Certificate Image URL"
            }
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    }
})

const BirthCertificate = academicDb.model("BirthCertificate", birthCertificateSchema, "employee.birthCertificate");

export default BirthCertificate;