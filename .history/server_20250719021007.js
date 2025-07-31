
import app from './app.js';
import http from 'http';
import { connectDb } from './config/db.config.js';
import dotenv from 'dotenv';
dotenv.config();
const server = http.createServer(app)


server.listen(process.env.port, ()=>{
    
    console.log(`server is running on port ${process.env.port}`)
})
