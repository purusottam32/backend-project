import 'dotenv/config';
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import app from "./app.js";
import connectDB from "./db/index.js" ;

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
    app.on("error", (err) => {            
        console.error("error: ", err);
        throw err;
    });
})
.catch((err)=>{
    console.error("MongoDb connection failed : ", err);
    throw err;
})





// const app = express();
// (async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         console.log("Connected to MongoDB");
//         app.on("error", (err) => {            
//             console.error("error: ", err);
//             throw err;
//         });


//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`);
//         });
//     }catch(err){
//         console.error("ERROR : ", err)
//         throw err;
//     }
// })()
