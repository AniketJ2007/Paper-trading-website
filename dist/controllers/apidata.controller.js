import YahooFinance from "yahoo-finance2";
import asynchandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { db } from "../index.js";
import { Orders, Users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { BuyNormal, SellNormal } from "./stock.controller.js";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const searchdata = asynchandler(async (req, res) => {
    const { symbol } = req.body;
    if (!symbol) {
        throw new ApiError(400, "All fields required");
    }
    const r1 = await yahooFinance.search(symbol, {
        region: "IN",
        enableFuzzyQuery: true,
        newsCount: 0,
        quotesCount: 25,
    });
    const equities = r1.quotes.filter((q) => "quoteType" in q && q.quoteType === "EQUITY" && (q.exchange === 'NSI' || q.exchange === 'BSE'));
    return res.status(200).json({
        data: equities,
        message: "Data fetched",
    });
});
const quotedata = asynchandler(async (req, res) => {
    const { symbols } = req.query;
    if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: "Symbols are required" });
    }
    const symbolList = symbols
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    if (symbolList.length === 0) {
        console.log("Error: Symbol list is empty after cleaning");
        return res.status(400).json({ error: "No valid symbols provided" });
    }
    const quotes = await yahooFinance.quote(symbolList);
    const responseData = {};
    quotes.forEach((q) => {
        responseData[q.symbol] = {
            price: q.regularMarketPrice,
            currency: q.currency,
            shortName: q.shortName
        };
    });
    res.json(responseData);
});
const isNSEOpen = () => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = istTime.getDay();
    if (day === 6 || day === 0)
        return false;
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;
    return currentMinutes >= marketOpen && currentMinutes <= marketClose;
};
const stockData = async (req, res) => {
    const { symbol, interval } = req.body;
    let inter = "1d";
    const marketOpen = isNSEOpen();
    let period;
    if (!marketOpen) {
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        period = new Date(istTime);
        const hours = istTime.getHours();
        const minutes = istTime.getMinutes();
        const currentMinutes = hours * 60 + minutes;
        const marketOpenTime = 9 * 60 + 15;
        if (currentMinutes < marketOpenTime) {
            period.setDate(period.getDate() - 1);
        }
        period.setHours(15, 30, 0, 0);
        while (period.getDay() === 6 || period.getDay() === 0) {
            period.setDate(period.getDate() - 1);
        }
    }
    switch (interval) {
        case "1D":
            period = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            inter = "5m";
            break;
        case "1W":
            period = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            inter = "60m";
            break;
        case "1M":
            period = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            inter = "1d";
            break;
        case "3M":
            period = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            inter = "5d";
            break;
        case "1Y":
            period = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            inter = "1wk";
            break;
    }
    let result = {};
    const syb = symbol + ".NS";
    try {
        result = await yahooFinance.chart(syb, {
            period1: period,
            interval: inter,
        });
    }
    catch (error) {
        if (error.message.includes("No data found")) {
            throw new ApiError(404, "Symbol is invalid or delisted");
        }
        else {
            console.log(error);
        }
    }
    if (!result) {
        throw new ApiError(404, "No stock data found");
    }
    const data = [];
    for (let i = 0; i < result.quotes.length; i++) {
        const element = result.quotes[i];
        if (element.open !== null && element.date !== null) {
            data.push({
                value: element.open,
                time: Math.floor(new Date(element.date).getTime() / 1000),
            });
        }
    }
    return res.status(200).json({
        chart: result,
        data: data,
    });
};
const Polldata = async (order) => {
    try {
        const symbol = order.symbol;
        const quote = await yahooFinance.quote(`${symbol}.NS`);
        if (!quote) {
            throw new ApiError(400, "Quote fetch failed");
        }
        const price = quote.regularMarketPrice;
        const user = await db
            .select()
            .from(Users)
            .where(eq(Users.id, order.user_id));
        if (user.length === 0) {
            throw new ApiError(404, "User not found");
        }
        if (price >= Number(order.price) && order.order_type === "Sell") {
            const req = {
                body: {
                    stock_name: symbol,
                    quantity: order.quantity,
                    curr_price: order.price,
                },
                user: {
                    id: user[0].id,
                    email: user[0].email,
                    name: user[0].name,
                    balance: user[0].balance,
                },
            };
            const res = {
                status: (code) => ({
                    json: (data) => console.log(`Response: ${code}`, data),
                }),
            };
            const next = (error) => {
                if (error) {
                    console.error("Error:", error);
                }
            };
            const resp = SellNormal(req, res, next);
            await db
                .update(Orders)
                .set({
                status: "Completed",
            })
                .where(eq(Orders.id, order.id));
            return "COMPLETED";
        }
        else if (price <= Number(order.price) && order.order_type === "Buy") {
            const req = {
                body: {
                    stock_name: symbol,
                    quantity: order.quantity,
                    curr_price: order.price,
                },
                user: {
                    id: user[0].id,
                    email: user[0].email,
                    name: user[0].name,
                    balance: user[0].balance,
                },
            };
            const res = {
                status: (code) => ({
                    json: (data) => console.log(`Response: ${code}`, data),
                }),
            };
            const next = (error) => {
                if (error) {
                    console.error("Error:", error);
                }
            };
            const resp = BuyNormal(req, res, next);
            await db
                .update(Orders)
                .set({
                status: "Completed",
            })
                .where(eq(Orders.id, order.id));
            return "COMPLETED";
        }
        const diff = ((price - Number(order.price)) / Number(order.price)) * 100;
        return Math.abs(diff);
    }
    catch (error) {
        console.error(`Error polling order ${order.id}:`, error);
        return 999;
    }
};
const GetOrders = asynchandler(async () => {
    const pendingOrders = await db
        .select()
        .from(Orders)
        .where(eq(Orders.status, "PENDING"));
    return pendingOrders;
});
const getFrontData = async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/gainers');
        const gainer = await response.json();
        const response1 = await fetch('http:127.0.0.1:5000/api/losers');
        const loser = await response1.json();
        const response2 = await fetch('http:127.0.0.1:5000/api/index');
        const indices = await response2.json();
        const response3 = await fetch('http:127.0.0.1:5000/api/indices');
        const graphs = await response3.json();
        return res.status(200).json({ gainer, loser, indices, graphs });
    }
    catch (error) {
        console.log(error);
        return res.status(400).json({
            success: false,
            message: "Failed to fetch",
            error: error.message
        });
    }
};
export { searchdata, GetOrders, Polldata, stockData, getFrontData, quotedata };
