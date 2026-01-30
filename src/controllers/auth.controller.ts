import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asynchandler from "../utils/asynchandler";
import { Users } from "../db/schema";
import { db } from "..";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { refreshToken } from "../utils/Tokens";
interface ApiRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    balance: string;
  };
}
const RegisterUser = asynchandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields required",
    });
  }
  const result = await db.select().from(Users).where(eq(Users.email, email));
  if (result.length > 0) {
    return res.status(400).json({
      message: "User already exists",
    });
  }
  const newPass = await bcrypt.hash(password, 10);
  const insertuser = await db.insert(Users).values({
    name: name,
    email: email,
    password: newPass,
  });
  return res.status(200).json({
    insertuser,
    message: "User created",
  });
});

const LoginUser = asynchandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "All fields required",
    });
  }
  const result = await db.select().from(Users).where(eq(Users.email, email));
  if (result.length == 0) {
    return res.status(400).json({
      message: "User with this email doesnt exist",
    });
  }
  const passcheck = await bcrypt.compare(password, result[0].password);
  if (!passcheck) {
    return res.status(400).json({
      message: "Password is Wrong",
    });
  }
  const token = refreshToken(result[0].id);
  const options = {
    httpOnly: true,
    secure: true,
  };

  res.cookie("Token", token, options);

  return res.status(200).json({
    message: "Login Successful",
  });
});
const getUser = (async(req:ApiRequest,res:Response)=>{
 const user=req.user
 return res.status(200).json({
  user,
  message:"User sent"
 })
})
export { RegisterUser, LoginUser,getUser };
