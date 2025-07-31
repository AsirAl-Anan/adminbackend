import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
    try {
        let admin = await Admin.findOne({ email }).select("+password");

        if (!admin) {
            return "no-admin";
        }

        const isValid = await admin.comparePassword(password);

        if (!isValid) {
            return "invalid-password";
        }

        admin = admin.toObject();
        delete admin.password;
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
            return "admin-exists";
        }

        const admin = await Admin.create({ email, password });
        
        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};
