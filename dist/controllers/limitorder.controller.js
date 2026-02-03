import { Polldata } from "./apidata.controller.js";
import { Orders } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
const checkTime = () => {
    const now = new Date();
    const options = { timeZone: "Asia/Kolkata", hour12: false, weekday: 'long', hour: 'numeric', minute: 'numeric' };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;
    const day = getPart('weekday');
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);
    if (day === "Sat" || day === "Sun") {
        return false;
    }
    const currentMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;
    return currentMinutes >= marketOpen && currentMinutes <= marketClose;
};
const five_mins = new Map();
const two_mins = new Map();
const sixty_secs = new Map();
async function initQueues() {
    if (!checkTime())
        return;
    const pendingOrders = await db
        .select()
        .from(Orders)
        .where(eq(Orders.status, "PENDING"));
    for (const order of pendingOrders) {
        if (sixty_secs.has(order.id) ||
            two_mins.has(order.id) ||
            five_mins.has(order.id)) {
            continue;
        }
        const res = await Polldata(order);
        if (typeof res == "number") {
            if (res < 0.5) {
                sixty_secs.set(order.id, order);
            }
            else if (res <= 2.0) {
                two_mins.set(order.id, order);
            }
            else {
                five_mins.set(order.id, order);
            }
        }
    }
}
function startPolling() {
    initQueues();
    setInterval(async () => {
        if (!checkTime())
            return;
        for (const [id, order] of sixty_secs) {
            const res = await Polldata(order);
            if (res === "COMPLETED") {
                sixty_secs.delete(id);
                continue;
            }
            if (typeof res === "number") {
                if (res > 2.0) {
                    sixty_secs.delete(id);
                    five_mins.set(id, order);
                }
                else if (res > 0.5) {
                    sixty_secs.delete(id);
                    two_mins.set(id, order);
                }
            }
        }
    }, 60000);
    setInterval(async () => {
        if (!checkTime())
            return;
        for (const [id, order] of two_mins) {
            const res = await Polldata(order);
            if (res === "COMPLETED") {
                two_mins.delete(id);
                continue;
            }
            if (typeof res === "number") {
                if (res > 2.0) {
                    two_mins.delete(id);
                    five_mins.set(id, order);
                }
                else if (res < 0.5) {
                    two_mins.delete(id);
                    sixty_secs.set(id, order);
                }
            }
        }
    }, 120000);
    setInterval(async () => {
        if (!checkTime())
            return;
        for (const [id, order] of five_mins) {
            const res = await Polldata(order);
            if (res === "COMPLETED") {
                five_mins.delete(id);
                continue;
            }
            if (typeof res === "number") {
                if (res <= 2.0 && res > 0.5) {
                    five_mins.delete(id);
                    two_mins.set(id, order);
                }
                else if (res <= 0.5) {
                    five_mins.delete(id);
                    sixty_secs.set(id, order);
                }
            }
        }
    }, 300000);
    //Clear Arrays if Market Time is Over
    // Refresh from database
    setInterval(async () => {
        if (!checkTime()) {
            sixty_secs.clear();
            two_mins.clear();
            five_mins.clear();
            return;
        }
        sixty_secs.clear();
        two_mins.clear();
        five_mins.clear();
        await initQueues();
    }, 600000);
}
export { startPolling };
