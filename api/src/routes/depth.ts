
import { Router } from "express";
import { RedisManager } from "../RedisManager";
import { GET_DEPTH } from "../types";
import { parseMarket } from "../validation";

export const depthRouter = Router();

depthRouter.get("/", async (req, res) => {
    const parsedMarket = parseMarket(req.query.symbol ?? req.query.market, "symbol");
    if (!parsedMarket.success) {
        return res.status(400).json({ message: parsedMarket.message });
    }

    const response = await RedisManager.getInstance().sendAndAwait({
        type: GET_DEPTH,
        data: {
            market: parsedMarket.data
        }
    });

    res.json(response.payload);
});
