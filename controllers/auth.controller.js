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

  // Prefer the httpOnly cookie; fall back to the value sent in the request
  // body (set by the frontend before the cookie race resolves).
  const fingerprint = req.cookies.fp || sentFingerprint;

  try {
    if (!fingerprint) {
      return res.status(400).json({ success: false, message: "Fingerprint missing" });
    }

    // If the cookie wasn't set yet, persist it now so future requests use it
    if (!req.cookies.fp && sentFingerprint) {
      res.cookie("fp", sentFingerprint, {
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      });
    }

    const deviceInfo = buildDeviceInfo(req, fingerprint);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // --- JWT CHECK DISABLED TEMPORARILY FOR DEBUGGING ---
    const sessionEmail = email;
    // --------------------------------------------------

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

    // Store the full employee object in the session (not just email).
    // Do NOT call regenerate() — it issues a new session ID via Set-Cookie, but
    // the SPA's immediate fetchUser() fires before the browser stores the new
    // cookie, causing the old (now-deleted) session ID to be sent → empty session.
    req.session.employee = response;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ success: false, message: "Session save failed" });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ success: true, response });
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
  console.log("DIAGNOSTIC: Entering employeeGoogleCallbackController");
  const code = req.query.code;
  console.log("DIAGNOSTIC: Code received:", code ? "YES" : "NO");
  try {
    const { tokens } = await oAuth2Client.getToken(code)
    if (!tokens.access_token) {
      return res.redirect(`${CLIENT_URL}/login?error=Invalid code`)
    }
    oAuth2Client.setCredentials(tokens);

    // Decode the id_token to get user info
    const idToken = tokens.id_token;
    const userData = jwt.decode(idToken);
    if (!userData) {
      return res.redirect(`${CLIENT_URL}/login?error=Invalid token`)
    }

    const email = userData.email;
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.redirect(`${CLIENT_URL}/login?error=Employee not found`)
    }

    // DIAGNOSTIC: Clear stale data and set new data
    console.log("DIAGNOSTIC: Found employee, setting session...");
    delete req.session.access_tokens; // Clear stale data if present
    req.session.employee = employee.toObject();
    delete req.session.employee.password;
    req.session.test_persistence = "SUCCESS_" + Date.now();

    console.log("DIAGNOSTIC: Saving session...");
    req.session.save((err) => {
      if (err) {
        console.error("DIAGNOSTIC: Session save FAILED:", err);
        return res.redirect(`${CLIENT_URL}/login?error=Session error`)
      }
      console.log("DIAGNOSTIC: Session saved successfully. Redirecting to:", CLIENT_URL);
      res.redirect(`${CLIENT_URL}/`)
    });

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
