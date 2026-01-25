import jwt from "jsonwebtoken";
import { Users } from "../db/schema";
export const refreshToken = (userId:number) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "10d",
    },
  );
};
