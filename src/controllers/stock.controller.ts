import { Holdings, Orders, Transactions, Users } from "../db/schema";
import { Request, Response } from "express";
import asynchandler from "../utils/asynchandler";
import { ApiError } from "../utils/ApiError";
import { db } from "..";
import { and, eq, sql } from "drizzle-orm";
interface ApiRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    balance: string;
  };
}
const BuyNormal = asynchandler(async (req: ApiRequest, res: Response) => {
  const { stock_name, quantity, curr_price } = req.body;
  if (!stock_name || !quantity || !curr_price) {
    throw new ApiError(400, "All fields Required");
  }
  const user = req.user;
  const user_balance = await db
    .select({ amount: Users.balance })
    .from(Users)
    .where(eq(Users.id, user.id));
  if (quantity * curr_price > Number(user_balance)) {
    throw new ApiError(500, "User doesnt have sufficient balance");
  }

  const holding1 = await db.insert(Holdings).values({
    stock_name: stock_name,
    buy_price: curr_price,
    user_id: user.id,
    quantity: quantity,
  });
  const result = await db
    .update(Users)
    .set({
      balance: sql`${Users.balance} - ${quantity * curr_price}`,
    })
    .where(eq(Users.id, user.id));
  const transaction1 = await db.insert(Transactions).values({
    user_id: user.id,
    quantity: quantity,
    symbol: stock_name,
    type: "Buy",
    price: curr_price,
  });
  return res.status(200).json({
    transaction1,
    holding1,
    message: "Bought succesfully",
  });
});
const SellNormal = asynchandler(async (req: ApiRequest, res: Response) => {
  const { stock_name, quantity, curr_price } = req.body;
  if (!stock_name || !quantity || !curr_price) {
    throw new ApiError(400, "All fields Required");
  }
  const user = req.user;
  const holding1 = await db
    .select()
    .from(Holdings)
    .where(
      and(eq(Holdings.user_id, user.id), eq(Holdings.stock_name, stock_name)),
    );
  if (holding1.length === 0) {
    throw new ApiError(404, "User doesnt own stock");
  }
  if (holding1[0].quantity < quantity) {
    throw new ApiError(400, "Insufficient quantity to sell");
  }
  const result1 = await db
    .update(Users)
    .set({
      balance: sql`${Users.balance} + ${quantity * curr_price}`,
    })
    .where(eq(Users.id, user.id));
  if (quantity === holding1[0].quantity) {
    const del = await db
      .delete(Holdings)
      .where(eq(Holdings.id, holding1[0].id));
  } else {
    const result2 = await db
      .update(Holdings)
      .set({
        quantity: sql`${Holdings.quantity} - ${quantity}`,
      })
      .where(eq(Holdings.id, holding1[0].id));
  }
  const transaction1 = await db.insert(Transactions).values({
    user_id: user.id,
    quantity: quantity,
    symbol: stock_name,
    type: "Sell",
    price: curr_price,
  });
  return res.status(200).json({
    transaction1,
    holding1,
    message: "Sold succesfully",
  });
});

const addOption = asynchandler(async (req: ApiRequest, res: Response) => {
  const { stock_name, type, quantity, target_price } = req.body;
  if (!stock_name || !quantity || !target_price || !type) {
    throw new ApiError(400, "All fields Required");
  }
  const user=req.user
  const result=await db.insert(Orders).values({
   user_id:user.id,
   symbol:stock_name,
   order_type:type,
   quantity:quantity,
   price:target_price
  })
  return res.status(200).json({
    result,
    message:"Order placed"
  })
});
export { BuyNormal, SellNormal, addOption };
