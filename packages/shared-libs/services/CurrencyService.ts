import axios from 'axios';

import {Money} from "../models/universal.types";
import { getRedisDb } from "../rdb/index.js";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

interface ExchangeRateResponse {
    result: string;
    base_code: string;
    conversion_rates: Record<string, number>;
    time_last_update_utc: string;
}

const WCC_EXPIRY = 2 * 60 * 60

// https://v6.exchangerate-api.com/v6/b4dece2e320eed6e1329556b/latest

// https://v6.exchangerate-api.com/v6/b4dece2e320eed6e1329556b/pair/CLP/COP

// https://v6.exchangerate-api.com/v6/b4dece2e320eed6e1329556b/latest/CLP

export async function convert(from: string, to: string , amount: number) : Promise<Money>
{

    try {

        if(from === to){
            return { amount: amount, unit: to }
        }

        const exchangeRateStr = await getRedisDb().get(`currency:${from}:${to}`);
        if(exchangeRateStr){
            const exchangeRate = Number(exchangeRateStr);
            return { amount: amount * exchangeRate, unit: to}
        }

        // 1. This API provides all rates for the base currency in one call
        const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${from}`;
        const response = await axios.get<ExchangeRateResponse>(url);

        const rates = response.data.conversion_rates;
        const target = String(to).toUpperCase();

        // 2. Filter the returned data for your destination currency
        if (!rates[target]) {
            // @ts-ignore
            return res.status(404).json({error: `Currency '${target}' not supported.`});
        }

        const convertedAmount = Number(amount) * rates[target];

        await getRedisDb().set(`currency:${from}:${to}`, "" + rates[target], {EX: WCC_EXPIRY})


        // @ts-ignore
/*        return res.json({
            from: from,
            to: target,
            amount: Number(amount),
            convertedAmount: Number(convertedAmount.toFixed(2)),
            rate: rates[target],
            last_update: response.data.time_last_update_utc
        });*/

        return {
            amount: convertedAmount,
            unit: to,
        }
    } catch (error: any) {
        // @ts-ignore
        return res.status(500).json({error: "Failed to fetch exchange rates"});
    }
}


