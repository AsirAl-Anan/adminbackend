import Message from "../models/message.model.js";
import { uploadImage } from "../utils/cloudinary.js";

export const createMessage =async  (message, sender, imageFile) =>{
// sender -> email of the sender 
if(!sender){
    return "invalid-data";
}
if(!message && !imageFile) return "invalid-data";
let imageUrl
if(imageFile){
const image= await   uploadImage(imageFile)
imageUrl = image?.data?.url
}

const newMessage = await Message.create({message, sender,image:imageUrl})
console.log("new", newMessage)
if(!newMessage){
    return null;
}

return newMessage

}

export const fetchMessages = async () =>{
    const messages = await Message.find().select("-__v");
    return messages;
}

