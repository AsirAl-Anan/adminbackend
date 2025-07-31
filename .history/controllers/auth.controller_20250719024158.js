/*************  ✨ Windsurf Command 🌟  *************/
import { loginAdmin } from "../services/auth.service.js"
export const adminLoginController = async (req,res) =>{
    const {email, password} = req.body
   const admin = await loginAdmin(email,password)

export const adminLoginController = async (req, res) => {
  const { email, password } = req.body
   req.session.admin = admin

  try {
    const admin = await loginAdmin(email, password)

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    req.session.admin = admin

    res.status(200).json({
      success: true,
      admin,
        success:true,
        admin
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    })
  }

}
/*******  b959cd26-7d1c-4e8c-8f58-76aadabaadc2  *******/