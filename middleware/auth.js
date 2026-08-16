import User from "../models/User.js"
import jwt from "jsonwebtoken"

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authorized, no token provided" 
            });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decodedToken.uid).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        req.user = user;
        next();
        
    } catch (error) {
        console.log("Auth Middleware Error:", error.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
}