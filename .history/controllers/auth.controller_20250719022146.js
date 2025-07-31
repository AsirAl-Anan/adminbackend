import { loginAdmin } from "../services/auth.service.js"
export const adminLoginController = (req,res) =>{
    const {email, password} = req.body
    loginAdmin

}