import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options={
      httpOnly :true,
      secure:true
    }
const generateAccessAndRefreshTokens = async (userId) => {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();


      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
const options={
      httpOnly :true,
      secure:true
    }}

const registerUser = asyncHandler(async (req, res) => {
  // get user data
  // validation of user data
  // check if user already exists : both username and email
  // check for images,check for avatars
  // upload them to cloudinary
  // create user object - user entry in db
  // remove password and reference token field from response
  // check for user creation success and send response accordingly

  const { fullName, username, email, password } = req.body;
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "User already exists with the provided email or username"
    );
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path || req.file?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar?.url) {
    throw new ApiError(500, "Avatar upload failed");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User registration failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    //user name or email and password
    //validation of data
    //check if user exists with email or username
    //if user exists then compare password
    //if password matches then generate access token and refresh token > cookie
    //save refresh token in db
    //send response with access token and user details except password and reference token

    const {  email, password } = req.body;
    console.log("Login request received with email:", email);
    if ([email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Email and password are required");
    }
    const existedUser = await User.findOne({
        $or: [{ email }],
    });
    
    if (!existedUser) {
        throw new ApiError(404, "User not found with the provided email or username");
    }

    const isPasswordCorrect = await existedUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password");
    }  

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existedUser._id);
    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken");

    

    return res
    .status(200)
    .cookie("AccessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
          user: loggedInUser,
        },
        "User logged in successfully",
      )
    );
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:
      {
        refreshToken:undefined
      }
    },{
      new:true
    }
  ); 

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,"User logged out successfully"));
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken; 
    if(!incomingRefreshToken){
      throw new ApiError(400,"Unauthorized request, refresh token is missing");
    }
   try {
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id);
    if(!user){
     throw new ApiError(401,"Invalid refresh token");
    }
    if(user.refreshToken !== incomingRefreshToken){
     throw new ApiError(401,"Refresh token mismatch");
    }
    const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id);
    return res 
    .status(200)
    .cookie("AccessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(new ApiResponse(200,{accessToken,refreshToken:newrefreshToken}, "Access token refreshed successfully"));
   } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token"); 
   }
  })

export { registerUser, loginUser ,logoutUser,refreshAccessToken };