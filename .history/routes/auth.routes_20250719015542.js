import { Router } from "express";

const router = Router()


router.post('/login', (req,res)=>{
req.session.user = req.body
})
router.post('/logout', (req,res)=>{

})




export default router;