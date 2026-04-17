import { Schema } from "mongoose";

const  meetingSchema = new Schema({

    user_id: {type:string},
    meetingCode: {type:string,required:true},
    date:{type:Date,default:Date.now,required:true},

})

const Meeting = mongoose.model("Meeting",userSchema);

export {Meeting};