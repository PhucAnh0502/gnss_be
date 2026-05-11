import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import sendMail from "../utils/sendMail.js";

class ServiceError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "ServiceError";
        this.statusCode = statusCode;
    }
}

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const OTP_TTL_MS = 15 * 60 * 1000;
const passwordResetOtpStore = new Map();

const normalizeEmail = (email) => email.trim().toLowerCase();

const hashOtp = (otp) =>
    crypto.createHash("sha256").update(otp).digest("hex");

export const registerUser = async ({ username, email, password, confirmPassword }) => {
    if (password !== confirmPassword) {
        throw new ServiceError("Confirm password does not match", 400);
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
        throw new ServiceError("Email already in use", 400);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
        username,
        email,
        password_hash: hashedPassword,
    });

    return {
        message: "User created successfully",
        user: newUser,
        statusCode: 201,
    };
};

export const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new ServiceError("Invalid email or password", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new ServiceError("Invalid email or password", 400);
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return {
        message: "Login successful",
        token,
        user,
    };
};

export const sendForgotPasswordEmail = async ({ email }) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new ServiceError("Email not found", 400);
    }

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = Date.now() + OTP_TTL_MS;
    passwordResetOtpStore.set(normalizedEmail, {
        otpHash: hashOtp(otp),
        expiresAt,
    });

    const message = `Your GNSS password reset OTP is: ${otp}. This code expires in 15 minutes.`;

    await sendMail({
        email: user.email,
        subject: "Password Reset Request",
        message,
    });

    return { message: "Password reset OTP sent to your email" };
};

export const verifyResetOtpCode = async ({ email, otp }) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new ServiceError("Email not found", 400);
    }

    const otpRecord = passwordResetOtpStore.get(normalizedEmail);
    if (!otpRecord) {
        throw new ServiceError("OTP not found or expired", 400);
    }

    if (Date.now() > otpRecord.expiresAt) {
        passwordResetOtpStore.delete(normalizedEmail);
        throw new ServiceError("OTP has expired", 401);
    }

    if (otpRecord.otpHash !== hashOtp(otp)) {
        throw new ServiceError("OTP is invalid", 400);
    }

    return { message: "OTP verified successfully" };
};

export const resetUserPassword = async ({ email, otp, password, confirmPassword }) => {
    if (password !== confirmPassword) {
        throw new ServiceError("Confirm password does not match", 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new ServiceError("Email not found", 400);
    }

    const otpRecord = passwordResetOtpStore.get(normalizedEmail);
    if (!otpRecord) {
        throw new ServiceError("OTP not found or expired", 400);
    }

    if (Date.now() > otpRecord.expiresAt) {
        passwordResetOtpStore.delete(normalizedEmail);
        throw new ServiceError("OTP has expired", 401);
    }

    if (otpRecord.otpHash !== hashOtp(otp)) {
        throw new ServiceError("OTP is invalid", 400);
    }

    const hashedPassword = await hashPassword(password);
    await user.update({ password_hash: hashedPassword });
    passwordResetOtpStore.delete(normalizedEmail);

    return { message: "Password reset successful" };
};

export const changeUserPassword = async ({ userId, oldPassword, newPassword, confirmPassword }) => {
    if (!userId) {
        throw new ServiceError("Unauthorized", 401);
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw new ServiceError("User not found", 404);
    }

    if (newPassword !== confirmPassword) {
        throw new ServiceError("Confirm password does not match", 400);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
        throw new ServiceError("Old password is incorrect", 400);
    }

    user.password_hash = await hashPassword(newPassword);
    await user.save();

    return { message: "Password changed successfully" };
};

export { ServiceError };
