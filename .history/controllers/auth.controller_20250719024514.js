import { loginAdmin, registerAdmin } from "../services/auth.service.js"

export const adminLoginController = async (req, res) => {
  const { email, password } = req.body

  try {
    if(!email || !password){
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }
    const admin = await loginAdmin(email, password)

    if (!admin || admin === null) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      })
    }

    req.session.admin = admin

    res.status(200).json({
      success: true,
      admin,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    })
  }
}

export const adminRegisterController = async (req, res) =>{
    const { email, password } = req.body
    try {
        if(!email || !password){
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
              })
        }
    const admin =   await  registerAdmin(email, password)
    if(!admin){
        return res.status(400).json({
            success: false,
            message: "Admin already exists",
          })
    }
    } catch (error) {
        
    }
}