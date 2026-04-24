import express from "express"
import { checkAuth, getPublicKey, login, signup, updateProfile,updatePublicKey} from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup",signup)
userRouter.post("/login",login)
userRouter.put("/public-key-update",protectRoute,updatePublicKey)
userRouter.get("/get-public-key/:targetUserId",protectRoute,getPublicKey)
userRouter.put("/update-profile",protectRoute,updateProfile)
userRouter.get("/check",protectRoute,checkAuth)

export default userRouter;