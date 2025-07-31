import Admin from "../models/admin.model.js";

/*************  ✨ Windsurf Command 🌟  *************/
export const loginAdmin = async (email, password) => {
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
export const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})
    return admin
}
/*******  43f9e729-4d35-4881-bab6-4e758dd9fadc  *******/

export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

}