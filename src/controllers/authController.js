import {
    registerUser,
    loginUser,
    sendForgotPasswordEmail,
    verifyResetOtpCode,
    resetUserPassword,
    changeUserPassword,
    ServiceError,
} from "../services/authService.js";

const handleControllerError = (error, res, context) => {
    console.error(`${context} error:`, error);

    if (error instanceof ServiceError) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal server error" });
};


// User Registration
export const register = async (req, res) => {
    try {
        const result = await registerUser(req.body);
        return res.status(result.statusCode).json({
            message: result.message,
            user: result.user,
        });
    } catch (error) {
        return handleControllerError(error, res, "Register");
    }
}

// User Login
export const login = async (req, res) => {
    try {
        const result = await loginUser(req.body);
        return res.json(result);
    } catch (error) {
        return handleControllerError(error, res, "Login");
    }
}

//forgot password
export const forgotPassword = async (req, res) => {
    try {
        const result = await sendForgotPasswordEmail(req.body);
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Forgot Password");
    }
}

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const result = await resetUserPassword({
            email: req.body.email,
            otp: req.body.otp,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword,
        });

        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Reset Password");
    }
}

// Change Password
export const changePassword = async (req, res) => {
    try {
        const result = await changeUserPassword({
            userId: req.user?.id,
            oldPassword: req.body.oldPassword,
            newPassword: req.body.newPassword,
            confirmPassword: req.body.confirmPassword,
        });

        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Change Password");
    }
}

// Verify reset OTP
export const verifyResetOtp = async (req, res) => {
    try {
        const result = await verifyResetOtpCode({
            email: req.body.email,
            otp: req.body.otp,
        });
        return res.status(200).json(result);
    } catch (error) {
        return handleControllerError(error, res, "Verify Reset OTP");
    }
}