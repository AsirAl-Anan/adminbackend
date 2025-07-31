import express from 'express';
import cookies from 'cookie-parser';
import cors from 'cors';


const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
