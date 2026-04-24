import mongoose from "mongoose";
import 'dotenv/config'
import { dnsConfig } from "../lib/dnsConfig.js";
export const connectDB = async () =>{
    dnsConfig()
    try{
        await mongoose.connect(`${process.env.MONGO_DB_URI}/chatApp`)
        console.log("Database Connected")
    }catch(error){
            console.error(error)
    }
    
}