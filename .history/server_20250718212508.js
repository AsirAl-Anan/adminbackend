import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import http from 'http';


const server = http.createServer(app)


server.listen(process.env.port, ()=>{
    console.log(`server is running on port ${process.env.port}`)
})