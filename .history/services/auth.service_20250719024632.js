import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return "no-admin";
        }

        const isValid = await admin.comparePassword(password);

        if (!isValid) {
            return "invalid-password";
        }

        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const registerAdmin = async (email, password) => {
    try {
        const ifAdminExists = await Admin.findOne({ email });

        if (ifAdminExists) {
            return null;
        }

        const admin = await Admin.create({ email, password });
        
        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};
