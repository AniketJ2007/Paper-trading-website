import jwt from "jsonwebtoken";
export const refreshToken = (userId) => {
    return jwt.sign({
        id: userId,
    }, process.env.JWT_SECRET, {
        expiresIn: "10d",
    });
};
