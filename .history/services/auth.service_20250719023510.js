/*************  ✨ Windsurf Command 🌟  *************/
import Admin from "../models/admin.model.js";

export const loginAdmin = async (email, password) => {
  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin) {
    throw new Error("Invalid Credentials");
  }
export const loginAdmin = async (email, password) =>{
    const admin = await Admin.findOne({email,password})
    return admin
}

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid Credentials");
  }
export const registerAdmin = async (email, password) =>{
    const admin = await Admin.create({email,password})
    return admin

  return admin;
};

export const registerAdmin = async (email, password) => {
  const admin = await Admin.create({ email, password });
  return admin;
};
}
/*******  0470d784-0301-466b-a4c3-9535d23391a9  *******/