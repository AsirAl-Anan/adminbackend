import express from 'express';
import coo


const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}))
