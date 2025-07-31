import mongoose, { mongo } from "mongoose";


const adminSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        minlength:5
    },
    password:{
        type:String,
        required:true,
        minlength:6
    }

})