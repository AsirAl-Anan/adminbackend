import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
   if(!email || !password){
    return res.status(400).json({message:"email and password are required"})
   }
   

    const admin = await Admin.findOne({ email });

    if (!admin) {
        return res.status(404).json({message:"No admin found"});
    }

    const passwordMatch = await admin.comparePassword(password);

    if (!passwordMatch) {
        return res.status(400).json({message:"Password does not match"});
    }

    return admin;
};
export const registerAdmin = async (email, password) => {
    try {
        if (!email || !password) {
            throw new Error("Email and password are required");
        }
        
        const admin = await Admin.create({ email, password });
        return admin;
    } catch (error) {
        console.error("Error registering admin:", error);
        throw error;
    }
};
