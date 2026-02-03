import jwt from 'jsonwebtoken';
import asynchandler from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Users } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
const verifyJwt = asynchandler(async (req, res, next) => {
    var _a, _b, _c;
    let token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.Token) ||
        ((_b = req.header('Authorization')) === null || _b === void 0 ? void 0 : _b.replace('Bearer ', '')) ||
        ((_c = req.body) === null || _c === void 0 ? void 0 : _c.Token);
    if (!token) {
        throw new ApiError(401, 'Unauthorized request');
    }
    try {
        const verify = jwt.verify(token, process.env.JWT_SECRET);
        if (typeof verify !== 'object' || !('id' in verify)) {
            throw new ApiError(401, 'Unauthorized request');
        }
        const user = await db.select().from(Users).where(eq(Users.id, verify.id));
        if (!user || user.length === 0) {
            throw new ApiError(401, 'User not found');
        }
        req.user = user[0];
        next();
    }
    catch (error) {
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
