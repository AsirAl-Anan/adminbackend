import Admin from "../models/admin.model.js";

/**
 * Logs in an admin with the provided email and password.
 * @param {string} email The admin's email address.
 * @param {string} password The admin's password.
 * @returns {Promise<import("../models/admin.model").Admin | null>} The admin object if
 * the login is successful, or null if not.
 */
export const loginAdmin = async (email: string, password: string): Promise<Admin | null> => {
    const admin = await Admin.findOne({email,password})
    return admin
}

export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

}