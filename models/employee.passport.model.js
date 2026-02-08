import mongoose from "mongoose";
import { academicDb } from "../config/db.config.js";

const passportSchema = new mongoose.Schema({
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
                    message: "Invalid Passport Image URL"
                }
            },
            direction: {
                type: String,
                enum: ["detailsPage", "passportPage"],
                default: "detailsPage"
            }
        }
    ],
    isVerified: {
        type: Boolean,
        default: false
    }
})

const Passport = academicDb.model("Passport", passportSchema, "employee.passport");

export default Passport;