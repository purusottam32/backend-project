import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/user.model.js';
import { upload } from '../middlewares/multer.middleware.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import ApiResponse from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    // get user data
    // validation of user data
    // check if user already exists : both username and email
    // check for images,check for avatars
    // upload them to cloudinary
    // create user object - user entry in db
    // remove password and reference token field from response
    // check for user creation success and send response accordingly

    const {fullName, username, email, password} = req.body;
    if(
        [fullName, username, email, password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

   const existedUser= User.findOne({
        $or:[{ email }, { username }]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists with the provided email or username");
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar and cover image are required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }
    const user=User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500,"User registration failed");
    }

    return res.status(201).json(
        new ApiResponse(200,"User registered successfully",createdUser)
    )
});

export default registerUser;