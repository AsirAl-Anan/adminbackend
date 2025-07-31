import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return null;
        }

        const isValid = await admin.comparePassword(password);

        if (!isValid) {
            return null;
        }

        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const registerAdmin = async (email, password) => {
    try {
        const admin = await Admin.create({ email, password });
        if(!admin){
            
        }
        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};
