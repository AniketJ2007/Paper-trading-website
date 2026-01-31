import {
  Holdings,
  Orders,
  Transactions,
  Users,
  Watchlists,
} from "../db/schema";
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
  const user = req.user;
  const result = await db.insert(Orders).values({
    user_id: user.id,
    symbol: stock_name,
    order_type: type,
    quantity: quantity,
    price: target_price,
  });
  return res.status(200).json({
    result,
    message: "Order placed",
  });
});

const getHoldings = asynchandler(async (req: ApiRequest, res: Response) => {
  const user = req.user;
  const result = await db
    .select()
    .from(Holdings)
    .where(eq(Holdings.user_id, user.id));
  if (!result || result.length === 0) {
    return res.status(400).json({
      message: "No holdings exist",
    });
  }
  return res.status(200).json({
    holdings: result,
    message: "Fetched portfolio succesfully",
  });
});
const getTransactions = asynchandler(async (req: ApiRequest, res: Response) => {
  const user = req.user;
  const result = await db
    .select()
    .from(Transactions)
    .where(eq(Transactions.user_id, user.id));
  if (!result || result.length === 0) {
    return res.status(400).json({
      message: "No transactions exist",
    });
  }
  return res.status(200).json({
    transactions: result,
    message: "Fetched transactions succesfully",
  });
});
  const getWatchlists = asynchandler(async (req: ApiRequest, res: Response) => {
    const user = req.user;
    const result = await db
      .select()
      .from(Watchlists)
      .where(eq(Watchlists.user_id, user.id));
    if (!result) {
      return res.status(400).json({
        message: "No watchlists exist",
      });
    }
    return res.status(200).json({
      watchlists: result,
      message: "Fetched watchlists succesfully",
    });
  });

const addToWatchList = asynchandler(async (req: ApiRequest, res: Response) => {
  const user = req.user;
  let { symbol, notes } = req.body;
  if (!symbol) {
    return res.status(400).json({
      message: "Symbol is required",
    });
  }
  const query = db
    .select()
    .from(Watchlists)
    .where(and(eq(Watchlists.user_id, user.id), eq(Watchlists.symbol, symbol)));
  if ((await query).length > 0) {
    return res.status(400).json({
      message: "Symbol is already in watchlist please modify that",
    });
  }
  notes = notes ? notes : "No Comment";
  const result = await db.insert(Watchlists).values({
    user_id: user.id,
    notes: notes,
    symbol: symbol,
  });
  if (!result) {
    return res.status(400).json({
      message: "Error adding to watchlist",
    });
  }
  return res.status(200).json({
    message: "Added to watchlist",
  });
});
const deleteFromWatchList = asynchandler(
  async (req: ApiRequest, res: Response) => {
    const user = req.user;
    let { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({
        message: "Symbol is required",
      });
    }

    const result = await db
      .delete(Watchlists)
      .where(
        and(eq(Watchlists.user_id, user.id), eq(Watchlists.symbol, symbol)),
      );
    if (!result) {
      return res.status(400).json({
        message: "Error deleting from watchlist",
      });
    }
    return res.status(200).json({
      message: "Deleted from watchlist",
    });
  },
);
const updateWatchList = asynchandler(async (req: ApiRequest, res: Response) => {
  const user = req.user;
  let { symbol, notes } = req.body;
  if (!symbol) {
    return res.status(400).json({
      message: "Symbol is required",
    });
  }

  const result = await db
    .update(Watchlists)
    .set({
      notes: notes,
    })
    .where(and(eq(Watchlists.user_id, user.id), eq(Watchlists.symbol, symbol)));
  if (result.rowCount === 0) {
    return res.status(404).json({
      message: "Watchlist item not found or no changes made",
    });
  }
  return res.status(200).json({
    message: "Updated watchlist",
  });
});
export {
  BuyNormal,
  SellNormal,
  addOption,
  getHoldings,
  getTransactions,
  getWatchlists,
  addToWatchList,
  deleteFromWatchList,
  updateWatchList,
};
