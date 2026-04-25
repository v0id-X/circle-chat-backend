import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    profilePic: {
        type: String,
        default: ""
    },
    bio: {
        type: String
    },
    publicKey: {
        type: String,
        required: true,
        default: ""
    },
    encryptedPrivateKey: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true,
    },
    nonce: {
        type: String,
        required: true,
    }
}, {timestamps: true})

const User = mongoose.model("User",userSchema)

export default User