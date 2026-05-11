import {body, validationResult} from 'express-validator';

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array().map(err => ({ field: err.path, message: err.msg })) 
        });
    }
    next();
};

export const registerValidator = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 6 }).withMessage('Username must be at least 6 characters long'),
    
    body('email')
        .isEmail().withMessage('Email is not valid')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
        .withMessage('Password must contain at least 1 digit and 1 special character'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Confirm password does not match new password!');
            }
            return true;
        }),
    
    validate
]

export const loginValidator = [
    body('email').isEmail().withMessage('Email is not valid'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

export const forgotPasswordValidator = [
    body('email').isEmail().withMessage('Email is not valid').normalizeEmail(),
    validate,
];

export const verifyResetOtpValidator = [
    body('email').isEmail().withMessage('Email is not valid').normalizeEmail(),
    body('otp')
        .matches(/^\d{6}$/)
        .withMessage('OTP must be a 6-digit code'),
    validate,
];

export const changePasswordValidator = [
    body('oldPassword')
        .notEmpty().withMessage('Old password is required'),

    body('newPassword')
        .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/).withMessage('New password must contain at least 1 digit and 1 special character')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('New password cannot be the same as the old password!');
            }
            return true;
        }),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Confirm password does not match new password!');
            }
            return true;
        }),
    
    validate
];

export const resetPasswordValidator = [
    body('email').isEmail().withMessage('Email is not valid').normalizeEmail(),

    body('otp')
        .matches(/^\d{6}$/)
        .withMessage('OTP must be a 6-digit code'),

    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/).withMessage('Password must contain at least 1 digit and 1 special character'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Confirm password does not match new password!');
            }
            return true;
        }),
    
    validate
];