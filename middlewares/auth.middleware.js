export const verifyUser =(req, res, next) =>{

    const user =req.session.admin 
    console.log("user is user",user)
    if(!user){
        return res.status(401).json({
            success: false,
            message: "Unauthorized, access denied ",
          })
    }
   
 req.user = user
    next()
}
