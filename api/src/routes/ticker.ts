
import { Router } from "express";

export const tickersRouter = Router();

tickersRouter.get("/", async (req, res) => {    
    res.json({});
    // what i need to do is, from my engine, send the tickerprice via something, and here, recieve it
});
