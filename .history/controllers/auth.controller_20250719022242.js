import { loginAdmin } from "../services/auth.service.js"
export const adminLoginController = (req,res) =>{
    const {email, password} = req.body
   const admin =  loginAdmin(email,password)

   req.


    res.status(200).json({
        success:true,
        admin
    })
)
}