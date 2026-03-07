import { Router } from "express";
import {requiresApiKey } from "../../server.js";
import axios from "axios";
import {db as redisDb } from "../../connections/rdb.js";

const router = Router();

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
router.get("/exchange/all/:from", requiresApiKey, async (req, res, next) => {
    try {
        const from = req.params.from;

        const exchangeRateStr : any = await redisDb.get(`currency:all`);
        if(exchangeRateStr){
            return res.json(JSON.parse(exchangeRateStr))
        }

        const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${from}`;
        const response = await axios.get(url);

        await redisDb.set(`currency:all`, JSON.stringify(response.data), { EX: 2 * 60 * 60})

        res.json(response.data)
    }catch(e){
        next(e)
    }
});

export default router;