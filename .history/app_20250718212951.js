import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';


const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cookieParser());
app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials:true
    }
));
app.get('/', (req,res)=>{
    res.send('Hello World!');
})
app.use('/api/v1/auth')

export default app;