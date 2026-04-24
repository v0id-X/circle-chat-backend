
import Message from "../models/Message.js"
import User from "../models/User.js"
import { userSocketMap,io } from "../server.js"
import cloudinary from "../lib/cloudinary.js"

//Get all users except the logged in user
export const getUsersForSidebar = async (req,res)=>{
    try {
        const uid = req.user._id
        const filteredUsers = await User.find({_id: {$ne:uid}}).select("-password")

        //get no. of messeages not seen yet
        const unseenMessages = {}
        const promises = filteredUsers.map(async (user)=>{
            const messages = await Message.find({senderId: user._id , receiverId: uid, seen: false})
            if(messages.length>0){
                unseenMessages[user._id] = messages.length
            }

        })  

            await Promise.all(promises)

            return res.json({success: true, users: filteredUsers, unseenMessages})
            
    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}

//Get all messages for a selected user
export const getMessages = async(req,res) =>{
    try {
        const {id: selectedUserId} = req.params
        const myId = req.user._id

        const cursor = req.query.cursor;
        const limit = 20

        let query = {
            $or: [
                {senderId: myId,receiverId:selectedUserId},
                {senderId:selectedUserId,receiverId:myId}
            ]
        }

        if(cursor){
            query._id = {$lt:cursor}
        }

        const messages = await Message.find(query)
        .sort({_id:-1})
        .limit(limit)

       
        await Message.updateMany({senderId: selectedUserId, receiverId: myId,seen: false},
            {seen: true}
        )

        return res.json({success: true, messages: messages.reverse()})

    } catch (error) {
        console.log(error.message)
       return res.json({success: false, message: error.message})
    }
}

//Marking messages as seen
export const markMessageSeen = async(req,res)=>{
    try {
        const {id} = req.params
        await Message.findByIdAndUpdate(id,{seen: true})
         return res.json({success:true})
    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}

//sending message
 export const sendMessage = async(req,res)=>{
    try {
        const {text,nonce,image} = req.body
        const receiverId = req.params.id;
        const senderId = req.user._id

        let imageUrl
        if(image){

            const b64 = Buffer.from(image).toString('base64')
            const uploadPayload = `data:text/plain;base64,${b64}`
            const uploadResponse = await cloudinary.uploader.upload(uploadPayload,{
                resource_type: "raw",
                folder: "encrypted_messages"
            })
            imageUrl = uploadResponse.secure_url
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            nonce,
        })

        //Emitting new message to receiver's socket
        const receiverSocketId = userSocketMap[receiverId]
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage",newMessage)
        }

        return res.status(200).json({success: true, newMessage})

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({success: false, message: error.message})
    }
} 
