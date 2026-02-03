import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import asynchandler from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Users } from '../db/schema.js';
import { Request,Response ,NextFunction} from 'express';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
interface ApiRequest extends Request{
    user?: {
    id: number;
    email: string;
    name:string;
    balance:string
  };
}
const verifyJwt = asynchandler(async (req:ApiRequest, res:Response, next:NextFunction) => {
  let token =
    req.cookies?.Token ||
    req.header('Authorization')?.replace('Bearer ', '') ||
    req.body?.Token;
  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }
  try {
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof verify !== 'object' || !('id' in verify)) {
      throw new ApiError(401, 'Unauthorized request');
    }
    const user = await db.select().from(Users).where(eq(Users.id,verify.id))
    if (!user || user.length === 0) {
      throw new ApiError(401, 'User not found');
    }
    req.user = user[0]
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token expired');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Unauthorized request', error);
  }
});
export { verifyJwt };
