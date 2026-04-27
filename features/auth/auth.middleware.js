// Auth middleware — verifies session is active
export const verifyUser = (req, res, next) => {
    const user = req.session?.employee;
    if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized: no active session" });
    }
    req.user = user;
    next();
};

