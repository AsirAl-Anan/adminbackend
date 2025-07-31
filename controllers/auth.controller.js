import { loginAdmin, registerAdmin } from "../services/auth.service.js"

export const adminLoginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const response = await loginAdmin(email, password);

    if (response === "no-admin") {
      return res.status(404).json({
        success: false,
        message: "Admin does not exist",
      });
    }
    if (response === "invalid-password") {
      return res.status(401).json({
        success: false,
        message: "Incorrect Password",
      });
    }
    if (response === null) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }

    // Regenerate session to apply cookie settings fresh
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.status(500).json({ success: false, message: "Session error" });
      }

      req.session.admin = response.email;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ success: false, message: "Session save failed" });
        }

        res.setHeader('Cache-Control', 'no-store'); // prevent caching

        res.status(200).json({ success: true, response: response.email });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

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
   req.session.admin = response.email;
req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.status(500).json({
      success: false,
      message: "Session could not be saved",
    });
  } 
  console.log("Session saved successfully", req.session.admin);
  res.status(200).json({
    success: true,
    response: response.email,
  });
});

    } catch (error) {
        res.status(500).json(error)
    }
}