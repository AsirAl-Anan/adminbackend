import { loginEmployee, registerEmployee, logoutEmployee } from "../services/auth.service.js"
import { OAuth2Client } from "google-auth-library"
import Employee from "../models/employee.model.js";
import jwt from "jsonwebtoken"

import { buildDeviceInfo } from "../utils/buildDeviceInfo.util.js";

// Ensure you have this in your .env file
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const CLIENT_URL = process.env.NODE_ENV === "production"
  ? process.env.CLIENT_URL_PRODUCTION
  : process.env.CLIENT_URL_DEVELOPMENT;

export const employeeSecuredFingerprintController = async (req, res) => {
  const { fingerprint } = req.body;
  if (!fingerprint) {
    return res.status(400).json({ success: false, message: "Fingerprint is required" });
  }
  res.cookie("fp", fingerprint, {
    httpOnly: process.env.NODE_ENV === "production",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 24 * 7 * 1000
  })
  res.status(200).json({ success: true, message: "Fingerprint saved successfully" });
}

export const employeeLoginController = async (req, res) => {
  const { email, password, sentFingerprint } = req.body;
  const fingerprint = req.cookies.fp;
  try {
    if (!fingerprint) {
      return res.status(400).json({ message: "Fingerprint missing" });
    }
    const deviceInfo = buildDeviceInfo(req, fingerprint);

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

    const response = await loginEmployee(sessionEmail, password, deviceInfo);


    if (response === "no-employee") {
      return res.status(404).json({
        success: false,
        message: "Employee does not exist",
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

      req.session.employee = response.email;

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

export const employeeRegisterController = async (req, res) => {
  const { email, password } = req.body
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      })
    }
    const response = await registerEmployee(email, password)
    if (response === "employee-exists") {
      return res.status(400).json({
        success: false,
        message: "Employee already exists",
      })
    }
    req.session.employee = response.email;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({
          success: false,
          message: "Session could not be saved",
        });
      }
      console.log("Session saved successfully", req.session.employee);
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
console.log("oAuth2Client id", process.env.AUTH_CLIENT_ID)
console.log("oAuth2Client secret", process.env.AUTH_CLIENT_SECRET)
console.log("oAuth2Client redirect uri", process.env.AUTH_REDIRECT_URI)
export const employeeGoogleController = async (req, res) => {
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
export const employeeGoogleCallbackController = async (req, res) => {
  console.log("inside google call back controller")


  const code = req.query.code;
  console.log("code", code)
  try {
    const { tokens } = await oAuth2Client.getToken(code)
    console.log("tokens from google", tokens)
    if (!tokens.access_token) {
      return res.redirect(`${CLIENT_URL}/login?error=Invalid code`)
    }
    oAuth2Client.setCredentials(tokens);
    req.session.access_tokens = tokens;

    //fetching user information using id_token
    const idToken = tokens.id_token;

    const userData = jwt.decode(idToken);

    if (!userData) {
      return res.redirect(`${CLIENT_URL}/login?error=Invalid token`)
    }
    const email = userData.email;

    const employee = await Employee.findOne({ email }).select("email");

    if (!employee) {
      return res.redirect(`${CLIENT_URL}/login?error=Employee not found`)
    }

    const token = jwt.sign({ email: employee.email }, JWT_SECRET, { expiresIn: '5m' });

    res.cookie("auth_session", token, {
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 5 * 1000 // 5 minutes
    })

    console.log("Cookie set with JWT");
    res.redirect(`${CLIENT_URL}/login?email=` + employee.email)

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.redirect(`${CLIENT_URL}/login?error=Internal Server Error`)
  }
}

export const employeeLogoutController = async (req, res) => {
  try {
    const fingerprint = req.cookies.fp;
    if (!fingerprint) {
      return res.status(400).json({ success: false, message: "Fingerprint is required" });
    }
    const sessionEmail = req.session?.employee;
    if (!sessionEmail) {
      return res.status(401).json({
        success: false,
        message: "No active session found",
      });
    }
    const deviceInfo = buildDeviceInfo(req, fingerprint);
    const response = await logoutEmployee(sessionEmail, deviceInfo);
    if (response === "no-employee") {
      return res.status(404).json({
        success: false,
        message: "Employee does not exist",
      });
    }
    if (response === "no-employee-history") {
      return res.status(404).json({
        success: false,
        message: "Employee history not found",
      });
    }
    if (response === null) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Session destroy failed",
        });
      }

      res.clearCookie('connect.sid')
      res.clearCookie("employee", {
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    });
  } catch (error) {
    console.error("Employee logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
    });
  }
};
