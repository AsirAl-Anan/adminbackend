import {createMessage,fetchMessages} from "../services/message.service.js";
export const sendMessageController =async (req,res) =>{
    const {message, sender} = req.body;       
    const imageFile = req.file;
    //problem: message is not accepted if the message is empty even if theres a image
    //sender -> email
    if(!message && !imageFile){
        return res.status(400).json({
            success: false,
            message: "Please provide message or image",
        })
    }
    if(!sender){
        return res.status(400).json({
            success: false,
            message: "Please provide message and email",
    }
 )
}
const newMessage = await createMessage(message, sender, imageFile)
if(newMessage === "invalid-data"){
    return res.status(400).json({
        success: false,
        message: "Invalid Data",
    })
}
if(!newMessage){
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    })
}
res.status(201).json({
    success: true,
    message: newMessage,
})


}

export const getMessagesController =async (req,res) =>{ 
    const employee = req.session.employee  // employee -> email of employee
   const allMessages = await fetchMessages();
    if(allMessages.length === 0){
        return res.status(200).json({
            success: true,
            messages: allMessages,
        
        })
    }
    const modifiedMessages = allMessages.map(message =>{
        let jsMessage = message.toObject();

        return {
            ...jsMessage,
            sender: jsMessage?.sender?.split("@")[0],
            time :jsMessage.createdAt.toLocaleString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            isOwn: jsMessage.sender === employee,
        }
    })
    res.status(200).json({
        success: true,
        messages: modifiedMessages,
    })


}