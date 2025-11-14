
import app from './app.js';
import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
dotenv.config();



const server = http.createServer(app)
const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "multipart/form-data"],
        exposedHeaders: ["Set-Cookie"],
    },

})

io.on("connection", (socket) =>{
    socket.emit("message", "Welcome to the socket.io chat room")
    socket.on("send_message", (message) =>{
        console.log(message)
        message.isOwn = false 
        socket.broadcast.emit("receive_message", message)
    })
    
  
})


const PORT = process.env.PORT ;

server.listen(PORT, ()=>{
    
    console.log(`server is running on port ${PORT}`)
})
