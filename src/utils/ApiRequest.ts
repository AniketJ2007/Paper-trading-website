import { Request } from "express";
interface ApiRequest extends Request{
    user?: {
    userId: number;
    email: string;
  };
}
