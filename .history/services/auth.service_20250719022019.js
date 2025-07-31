import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})
    return admin
}