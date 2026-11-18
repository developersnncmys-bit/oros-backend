import express from "express"
import { register,verifyRegisterOtp,login,verifyLoginOtp,me,adminLogin,registerWithPassword,loginWithPassword,forgotPassword,resetPassword } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register",register)
router.post("/register/otp-verify",verifyRegisterOtp)
router.post("/register-password",registerWithPassword)
router.post("/login",login)
router.post("/login-password",loginWithPassword)
router.post("/forgot-password",forgotPassword)
router.post("/reset-password",resetPassword)
router.post("/admin/login-otp",adminLogin)
router.post("/login/otp-verify",verifyLoginOtp)


router.get("/me",protect,me)
export default router;
