import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import http from 'http'
import { connectDB } from './db/db.js'
import userRouter from './routes/userRoutes.js'
import messageRouter from './routes/messageRoutes.js'
import {Server} from "socket.io"
import console from 'console'

const app = express()
const server = http.createServer(app)

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"

//Init socket.io server
export const io = new Server(server, {
    cors: {origin: frontendUrl, 
    credentials: true}
})

//store currently online users
export const userSocketMap ={}

//socket.io connection handler
io.on("connection",(socket)=>{
    const userId = socket.handshake.query.userId

    if(userId) userSocketMap[userId] = socket.id

    //Emitting online users to all other connected clients
    io.emit("getOnlineUsers",Object.keys(userSocketMap))

    socket.on("Typing",({senderId,receiverId})=>{
        const receiverSocketId = userSocketMap[receiverId]
        if(receiverSocketId){
            io.to(receiverSocketId).emit("Typing",{senderId})
        }
    })

    socket.on("StoppedTyping",({senderId,receiverId})=>{
        const receiverSocketId = userSocketMap[receiverId]
        if(receiverSocketId){
            io.to(receiverSocketId).emit("StoppedTyping",{senderId})
        }
    })

    socket.on("disconnect",()=>{
        console.log("User disconnected", userId)
        delete userSocketMap[userId]
        io.emit("getOnlineUsers",Object.keys(userSocketMap))
    })
})


app.use(express.json({limit:"50mb"}))
app.use(express.urlencoded({ limit: "50mb", extended: true }))
app.use(cors({
    origin: frontendUrl,
    credentials: true
}))

app.get('/ping', (req, res) => {
    res.status(200).json({ message: "Server is awake" });
});

//Routes setup
app.use("/api/status",(req,res)=>res.send("Server Running"))
app.use("/api/auth",userRouter)
app.use("/api/messages",messageRouter)

await connectDB()

const PORT = process.env.PORT || 8000
server.listen(PORT,()=>console.log("Server Running"))
