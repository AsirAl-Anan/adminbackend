import Admin from "../models/admin.model.js";

const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})

}