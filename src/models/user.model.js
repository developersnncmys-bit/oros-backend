import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({

    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
        trim: true
    },
    // bcrypt hash — only set for accounts that signed up with email+password.
    // Phone-OTP users have none, which is how `loginWithPasswordService`
    // tells apart "wrong password" from "no password on file" errors.
    passwordHash: {
        type: String,
        default: null,
        select: false
    },
    profileImage: {
        type: String,
        default: ""
    },
    profileImagePublicId: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "staff", "admin"],
        default: "user"
    },
    accountType: {
        type: String,
        enum: ["online", "manual"],
        default: "online"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
},
    {
        timestamps: true
    }
);

export default mongoose.models.User || mongoose.model("User", UserSchema)