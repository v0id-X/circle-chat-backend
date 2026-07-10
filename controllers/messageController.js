
import Message from "../models/Message.js"
import User from "../models/User.js"
import { userSocketMap,io } from "../server.js"
import cloudinary from "../lib/cloudinary.js"
import { Readable } from "stream"

const uploadRawBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "encrypted_messages" },
            (error, result) => error ? reject(error) : resolve(result)
        );
        Readable.from(buffer).pipe(uploadStream);
    });
};

export const getUsersForSidebar = async (req,res)=>{
    try {
        const uid = req.user._id
        const cursor = req.query.cursor;
        const limit = 30;

        let userQuery = { _id: { $ne: uid } };
        if (cursor) {
            userQuery._id = { $ne: uid, $gt: cursor };
        }

        const filteredUsers = await User.find(userQuery)
            .select("-password")
            .sort({ _id: 1 })
            .limit(limit);

        const unseenCounts = await Message.aggregate([
            { $match: { receiverId: uid, seen: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ]);

        const unseenMessages = {};
        unseenCounts.forEach(row => {
            unseenMessages[row._id.toString()] = row.count;
        });

        const nextCursor = filteredUsers.length === limit
            ? filteredUsers[filteredUsers.length - 1]._id
            : null;

        return res.json({ success: true, users: filteredUsers, unseenMessages, nextCursor })
            
    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}

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
        const updated = await Message.findOneAndUpdate(
            { _id: id, receiverId: req.user._id },
            { seen: true }
        )
        if(!updated){
            return res.status(403).json({success:false, message:"Not authorized to update this message"})
        }
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
            const uploadResponse = await uploadRawBuffer(Buffer.from(image, 'utf-8'))
            imageUrl = uploadResponse.secure_url
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            nonce,
        })

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
