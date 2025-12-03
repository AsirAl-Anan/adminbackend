import { loginAdmin, registerAdmin } from "../services/auth.service.js"
import { OAuth2Client } from "google-auth-library"
import Admin from "../models/admin.model.js";
import jwt from "jsonwebtoken"

// Ensure you have this in your .env file
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const adminLoginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // --- CHANGE START: JWT Verification ---
    const token = req.cookies.auth_session;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, session expired. Please log in again",
      })
    }

    let sessionEmail;
    try {
      // Verify the signature of the cookie
      const decoded = jwt.verify(token, JWT_SECRET);
      sessionEmail = decoded.email;
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, invalid or expired session token.",
      })
    }
    // --- CHANGE END ---

    if (sessionEmail !== email) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized, email mismatch. Please log in again",
      })
    }

    const response = await loginAdmin(sessionEmail, password);


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

    // Regenerate session to apply cookie settings fresh (Original code preserved)
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

export const adminRegisterController = async (req, res) => {
  const { email, password } = req.body
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }
    const response = await registerAdmin(email, password)
    if (response === "admin-exists") {
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
const oAuth2Client = new OAuth2Client(
  process.env.AUTH_CLIENT_ID,
  process.env.AUTH_CLIENT_SECRET,
  process.env.AUTH_REDIRECT_URI
);
export const adminGoogleController = async (req, res) => {
  try {

    const authorizedURL = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
      ]
    })
    res.redirect(authorizedURL)

  } catch (error) {
    res.status(500).json(error)
  }
}
export const adminGoogleCallbackController = async (req, res) => {
  console.log("inside callback")


  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code)
    if (!tokens.access_token) {
      return res.redirect("http://localhost:5173/login?error=Invalid code")
    }
    oAuth2Client.setCredentials(tokens);
    req.session.access_tokens = tokens;

    //fetching user information using id_token
    const idToken = tokens.id_token;
    const ticket = await oAuth2Client.verifyIdToken({
      idToken,
      audience: process.env.AUTH_CLIENT_ID,
    })
    const userData = ticket.getPayload();

    if (!userData) {
      return res.redirect("http://localhost:5173/login?error=Invalid token")
    }
    const email = userData.email;

    const admin = await Admin.findOne({ email }).select("email");

    if (!admin) {
      return res.redirect("http://localhost:5173/login?error=Admin not found")
    }

    // --- CHANGE START: Sign Email with JWT ---
    // Instead of storing raw email, we store a signed token
    const token = jwt.sign({ email: admin.email }, JWT_SECRET, { expiresIn: '5m' });

    res.cookie("auth_session", token, {
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 5 * 1000 // 5 minutes
    })
    // --- CHANGE END ---

    console.log("Cookie set with JWT");
    res.redirect("http://localhost:5173/login?email=" + admin.email)

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.redirect("http://localhost:5173/login?error=Internal Server Error")
  }
}