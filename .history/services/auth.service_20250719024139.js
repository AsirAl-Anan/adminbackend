import Admin from "../models/admin.model.js";

/*************  ✨ Windsurf Command 🌟  *************/
export const loginAdmin = async (email, password) => {
    try {
        const admin = await Admin.findOne({ email });
export const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})
    return admin
}

        if (!admin) {
            return null;
        }
export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

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

        return admin;
    } catch (error) {
        console.error(error);
        return null;
    }
};
}
/*******  b2fdd3ca-6282-415d-ae54-4129a25f6322  *******/