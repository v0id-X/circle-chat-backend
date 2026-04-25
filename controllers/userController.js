
import { genrateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js";
import 'dotenv/config'


//Signup
export const signup =  async (req,res)=>{
    const {fullName,email,password,bio,publicKey,encryptedPrivateKey,salt,nonce} = req.body ;

    try{
        if(!fullName || !email || !password || !bio || !publicKey || !encryptedPrivateKey || !salt ||!nonce){
        return res.json({success: false, message: "Missing Credentials"})
    }

    const user = await User.findOne({email})

    if(user){
         return res.json({success:false,message: "Email already in use!"})
    }

    const bcryptSalt = await bcrypt.genSalt(10);
    const hashedPasswowrd = await bcrypt.hash(password,bcryptSalt)
    
    const newUser = await User.create({
        fullName,email,password:hashedPasswowrd,bio,publicKey,encryptedPrivateKey,salt,nonce
    })

    const token = genrateToken(newUser._id)

    const userResponse = newUser.toObject()
    delete userResponse.password

     return res.json({success: true, userData: userResponse, token, message: "Account created successfully!"})

    }catch(error){
        console.log(error.message)
        return res.json({success: false,message: error.message})
    }
    
}

//Login
export const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        const userData = await User.findOne({email})

        const isPasswordCorrect = await bcrypt.compare(password,userData.password);

        

        if(!isPasswordCorrect){
           return res.json({success:false,message:"Incorrect Password!"})
        }

        const token = genrateToken(userData._id)

        const userResponse = userData.toObject()
        delete userResponse.password

        return res.json({success:true,message:"Login Successful",token,userData:userResponse})

    } catch (error) {
        console.log(error.message)
       return res.json({success:false,message:error.message})
    }
} 

// checking user authentication
export const checkAuth = (req,res)=>{
    return res.json({success:true,user: req.user})
}


export const updatePublicKey = async (req,res) =>{
    try {

       const {publicKey} = req.body
       const userId = req.user._id

       await User.findByIdAndUpdate(userId, {publicKey})
        
       return res.json({success:true,message:"public key updated succesfully!"})
    } catch (error) {
        return res.json({success:false,message:"failed to update user's public key"+error.message})
    }
}


//get public key for a certain user
export const getPublicKey = async(req,res)=>{
    try{
        const {targetUserId} = req.params
        const user = await User.findById(targetUserId).select('publicKey')
        
        if(!user){
           return res.json({success:false,message:"User not found!"})
        }

        if(!user.publicKey){
           return res.json({success:false,message:"Public key not available for the user"})
        }

        return res.json({
            success:true,
            publicKey:user.publicKey
        })
    }catch(error){
       return res.json({success:false,message:"server error",error:error.message})
    }
}

//updating profile
export const updateProfile = async (req,res)=>{
    try {
         const {profilePic,bio,fullName} = req.body
         let updatedUser

         const uid = req.user._id

         if(!profilePic){
            updatedUser = await User.findByIdAndUpdate(uid,{bio,fullName},{new:true})
         }else{
            const upload =await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(uid,{profilePic:upload.secure_url,bio,fullName},{new:true})
         }

         return res.json({success:true,user:updatedUser})
    } catch (error) {
        console.log(error.message)
        return res.json({success:false,message:error.message})
    }
}