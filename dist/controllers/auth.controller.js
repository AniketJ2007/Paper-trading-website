import asynchandler from "../utils/asynchandler.js";
import { Users } from "../db/schema.js";
import { db } from "../index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { refreshToken } from "../utils/Tokens.js";
const RegisterUser = asynchandler(async (req, res) => {
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
const LoginUser = asynchandler(async (req, res) => {
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
    res.cookie("Token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
    });
    return res.status(200).json({
        message: "Login Successful",
    });
});
const getUser = (async (req, res) => {
    const user = req.user;
    return res.status(200).json({
        user,
        message: "User sent"
    });
});
const logoutUser = asynchandler(async (req, res) => {
    res.cookie('Token', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: true,
        sameSite: 'none'
    });
    res.status(200).json({ message: 'Logged out successfully' });
});
export { RegisterUser, LoginUser, getUser, logoutUser };
