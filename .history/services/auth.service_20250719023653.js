import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
   if(!email || !password){
    return resizeBy.status(400).json({message:"email and password are required"}
   }
   

    const admin = await Admin.findOne({ email });

    if (!admin) {
        return null;
    }

    const passwordMatch = await admin.comparePassword(password);

    if (!passwordMatch) {
        return null;
    }

    return admin;
};

export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

}