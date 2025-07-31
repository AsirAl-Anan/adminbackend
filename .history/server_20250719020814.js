import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import http from 'http';
import { connectDb } from './config/db.config.js';

const server = http.createServer(app)


server.listen(process.env.port, ()=>{
    connectDb()
    console.log(`server is running on port ${process.env.port}`)
})