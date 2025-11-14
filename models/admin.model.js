import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { academicDb } from "../config/db.config.js";


const adminSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        minlength:5,
      
    },
    password:{
        type:String,
        required:true,
        trim:true,
        minlength:6,
        select:false
    },
    avatar:{
        type:String,
        default:""
    }


})


adminSchema.pre('save', async function (next){
 const salt = await bcrypt.genSalt(10);
 this.password = await bcrypt.hash(this.password, salt);
 next()
})

adminSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password, this.password)
}

 const Admin = academicDb.model('Admin',adminSchema)
 export default Admin
