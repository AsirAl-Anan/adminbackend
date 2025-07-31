import mongoose, { mongo } from "mongoose";
import bcrypt from "bcrypt";


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
    }

})


adminSchema.pre('save', async function (next){
 const salt = await bcrypt.genSalt(10);
 
})

 const Admin = mongoose.model('Admin',adminSchema)
 export default Admin