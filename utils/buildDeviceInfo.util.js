import crypto from "crypto";
import { UAParser } from "ua-parser-js";

const mapDeviceType = (type) => {
  switch (type) {
    case "mobile": return "mobile";
    case "tablet": return "tablet";
    default: return "web";
  }
};

const hashFingerprint = (fingerprint) => {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(fingerprint)
    .digest("hex");
};

const getClientIp = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress
  );
};

export const buildDeviceInfo = (req, fingerprint) => {
  const ua = new UAParser(req.headers["user-agent"]);
  const result = ua.getResult();

  return {
    deviceName: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
    hwId: hashFingerprint(fingerprint),
    deviceType: mapDeviceType(result.device.type),
    ip: getClientIp(req),
  };
};