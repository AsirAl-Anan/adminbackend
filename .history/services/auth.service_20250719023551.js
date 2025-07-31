import Admin from "../models/admin.model.js";

/*************  ✨ Windsurf Command 🌟  *************/
/**
 * Logs in an admin with the provided email and password.
 * @param {string} email The admin's email address.
 * @param {string} password The admin's password.
 * @returns {Promise<import("../models/admin.model").Admin | null>} The admin object if
 * the login is successful, or null if not.
 */
export const loginAdmin = async (email: string, password: string): Promise<Admin | null> => {
export const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})
    return admin
}
/*******  176fcbb9-7ba2-4fd4-b36c-2b16d973ab55  *******/

export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

}