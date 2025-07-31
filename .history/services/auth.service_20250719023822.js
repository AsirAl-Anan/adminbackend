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

/*************  ✨ Windsurf Command 🌟  *************/
export const registerAdmin = async (email, password) => {
    const newAdmin = await Admin.create({ email, password });
export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

    return newAdmin;
};
}
/*******  83891ebe-27df-475e-8312-1eb67a0c5a71  *******/