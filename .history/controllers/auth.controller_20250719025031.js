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
    const response = await loginAdmin(email, password)

    if (response === "no-admin") {
      return res.status(404).json({
        success: false,
        message: "Admin does not exist",
      })
    }
    if (response === "invalid-password") {
      return res.status(401).json({
        success: false,
        message: "Incorrect Password",
      })
    }
    if(response === null){
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      })
    }

    req.session.admin = response
   
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
    const response =   await  registerAdmin(email, password)
    if(response === "admin-exists"){
        return res.status(400).json({
            success: false,
            message: "Admin already exists",
          })
    }
    
    } catch (error) {
        res.status(500).json(error)
    }
}