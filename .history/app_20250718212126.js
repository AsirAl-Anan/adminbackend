import express from 'express';
import cookies from 'cookie-parser';



const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
