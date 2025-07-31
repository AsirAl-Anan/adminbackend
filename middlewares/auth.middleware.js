export const verifyUser =(req, res, next) =>{
    const user =    req.session.admin 
   
    if(!user){
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
          })
    }
    req.user = user
    next()

}
