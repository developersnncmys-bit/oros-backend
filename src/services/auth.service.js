import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Otp from "../models/otp.model.js";
import { generateJwtToken } from "../utils/jwt.js";
const fixedOtp = "123456";



export const registerService = async ({ name, email, phone }) => {

    if (!phone || !name || !email) {
        throw new Error(
            "Phone, name and email are required"
        );
    }

    const existing = await User.findOne({ phone });
    if (existing) {
        throw new Error("Mobile number is already exist please login");
    }
    const otpHash = await bcrypt.hash(fixedOtp, 10);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.findOneAndUpdate(
        { phone },
        {
            otpHash,
            expireAt,
            attempts: 0,
            consumeAt: null,
            lockedUntill: null
        },
        {
            upsert: true,
            new: true
        }
    );



    return {
        message: "Registration OTP sent successfully",
        data: {
        }
    }

};

export const verifyRegisterOtpService = async ({ name, email, phone, otp }) => {

    if (!phone || !otp || !name || !email) {
        throw new Error(
            "Phone, OTP, name and email are required"
        );
    }
    // const exist = await Otp.findOne({
    //     phone
    // });
    // if (!exist) {
    //     throw new Error("Mobile Number not eist");

    // }

    const otpRecord = await Otp.findOne({
        phone,
        consumeAt: null
    })

    if (!otpRecord) {
        throw new Error("otp not found");

    };
    if (otpRecord.expireAt < new Date()) {
        throw new Error("otp is expire");

    }
    if (otpRecord.lockedUntill && otpRecord.lockedUntill > new Date()) {
        throw new Error("otp verification is temporarily locked, try after 30 minut");
    };
    if (otpRecord.attempts >= 5) {
        otpRecord.lockedUntill = new Date(Date.now() + 30 * 60 * 1000);
        await otpRecord.save();
        throw new Error("maximum otp request reached");

    };
    const match = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!match) {
        otpRecord.attempts += 1;
        if (otpRecord.attempts >= 5) {
            otpRecord.lockedUntill = new Date(Date.now() + 30 * 60 * 1000);


        }

        await otpRecord.save();
        throw new Error("otp does not match,please try again");

    };
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
        throw new Error("User already exist please login ");

    };
    otpRecord.consumeAt = new Date();

    await otpRecord.save();

    const user = await User.create({
        phone,
        name,
        email,
        role: "user"
    });

    return {
        message: "Registration successfully",
        data: {
            user,
        }
    }

}

export const loginService = async ({ phone }) => {
    if (!phone) {
        throw new Error("mobile number is required for login");

    };
    const user = await User.findOne({
        phone
    })
    if (!user) {
        throw new Error("User not found,first resiter");
    };

    if (user.isBlocked) {
        throw new Error("Your account is blocked");

    };

    if (user.role !== "user") {
        throw new Error("This login is for customer accounts only. Admins and staff should use the admin panel.");
    };

    // const otpRecord = await Otp.findOne({ phone });
    // if (otpRecord.lockedUntill && otpRecord.lockedUntill > new Date()) {
    //     throw new Error("otp verification is temporarily locked, try after 30 minut");
    // }

    const otpHash = await bcrypt.hash(fixedOtp, 10);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndUpdate({ phone },
        {
            otpHash,
            expireAt,
            consumeAt: null,
            attempts: 0
        },
        {
            new: true,
            upsert: true
        }
    )

    return {
        message: "Login Otp send successfully",
        data: {}
    }
}


export const adminLoginService = async ({ phone }) => {
    if (!phone) {
        throw new Error("mobile number is required for login");

    };
    const user = await User.findOne({
        phone
    })
    if (!user) {
        throw new Error("User not found,first resiter");
    };

    if (user.isBlocked) {
        throw new Error("Your account is blocked");

    };

    if (!["admin", "staff"].includes(user.role)) {
        throw new Error("You are not authorized to access the admin console");

    };

    const otpRecord = await Otp.findOne({ phone });
    if (otpRecord && otpRecord.lockedUntill && otpRecord.lockedUntill > new Date()) {
        throw new Error("otp verification is temporarily locked, try after 30 minut");
    }

    const otpHash = await bcrypt.hash(fixedOtp, 10);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndUpdate({ phone },
        {
            otpHash,
            expireAt,
            consumeAt: null,
            attempts: 0
        },
        {
            new: true,
            upsert: true
        }
    )

    return {
        message: "Login Otp send successfully",
        data: {}
    }
}


// ── Email + password (no OTP, instant signup) ────────────────────────────

export const registerWithPasswordService = async ({ name, email, phone, password }) => {
    if (!name || !email || !password) {
        throw new Error("Name, email and password are required");
    }
    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedPhone = phone ? String(phone).trim() : "";

    // Email is the uniqueness key — phone is no longer checked for collisions
    // on signup (OTP-based register is disabled).
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
        throw new Error("An account with this email already exists, please login");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // phone is required on the schema; synthesize a placeholder when the
    // customer signs up with email-only. They can set a real one later from
    // their profile. The leading "@" keeps it from colliding with real
    // 10-digit numbers in India.
    const user = await User.create({
        name,
        email: normalizedEmail,
        phone: trimmedPhone || `@${Date.now()}${Math.floor(Math.random() * 1000)}`,
        passwordHash,
        role: "user"
    });

    const token = generateJwtToken({ _id: user._id, role: user.role });

    user.lastLoginAt = new Date();
    await user.save();

    return {
        message: "Account created",
        data: {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profileImage: user.profileImage
            },
            token
        }
    };
};

export const loginWithPasswordService = async ({ email, password }) => {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    // passwordHash is `select: false` on the schema — pull it in explicitly
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
        throw new Error("No account found with this email");
    }
    if (user.isBlocked) {
        throw new Error("Your account is blocked");
    }
    if (user.role !== "user") {
        throw new Error("This login is for customer accounts only. Admins and staff should use the admin panel.");
    }
    if (!user.passwordHash) {
        throw new Error("This account was created with phone OTP, please login with your mobile number");
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        throw new Error("Incorrect password");
    }

    const token = generateJwtToken({ _id: user._id, role: user.role });

    user.lastLoginAt = new Date();
    await user.save();

    return {
        message: "Login successful",
        data: {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profileImage: user.profileImage
            },
            token
        }
    };
};


export const verifyLoginOtpService = async ({
    phone,
    otp
}) => {

    if (!phone || !otp) {
        throw new Error("Phone and OTP are required");
    }

    const otpRecord = await Otp.findOne({
        phone,
        consumeAt: null
    })

    if (!otpRecord) {
        throw new Error("OTP not found");
    }

    if (otpRecord.expireAt < new Date()) {
        throw new Error("OTP is expired");
    }

    if (
        otpRecord.lockedUntill &&
        otpRecord.lockedUntill > new Date()
    ) {
        throw new Error(
            "OTP verification is temporarily locked, try after 30 minutes"
        );
    }

    // if (otpRecord.attempts >= 5) {

    //     otpRecord.lockedUntill = new Date(
    //         Date.now() + 30 * 60 * 1000
    //     );

    //     await otpRecord.save();

    //     throw new Error(
    //         "Maximum OTP attempts reached"
    //     );
    // }

    const match = await bcrypt.compare(
        otp,
        otpRecord.otpHash
    );

    if (!match) {

        otpRecord.attempts += 1;

        if (otpRecord.attempts >= 5) {
            otpRecord.lockedUntill = new Date(
                Date.now() + 30 * 60 * 1000
            );
        }

        await otpRecord.save();

        throw new Error(
            "OTP does not match, please try again"
        );
    }

    const user = await User.findOne({ phone });

    if (!user) {
        throw new Error(
            "User not found, please register first"
        );
    }

    if (user.isBlocked) {
        throw new Error("Your account is blocked");
    }


    const token = generateJwtToken({ _id: user._id, role: user.role });

    otpRecord.consumeAt = new Date();

    await otpRecord.save();

    user.lastLoginAt = new Date();

    await user.save();

    return {
        message: "Login successful",
        data: {
            user,
            token
        }
    };
};
