import { Router } from "express";
import {requiresApiKey } from "../../server.js";
import axios from "axios";
import crypto from "node:crypto";
import {allCurrencies, ExchangeRateResponse} from "../../services/exchangeService.js";

const router = Router();



router.get("/exchange/all/:from", requiresApiKey, async (req, res, next) => {
    try {
        const from = req.params.from;

        const data = await allCurrencies(from)

        res.json(data)
    }catch(e){
        next(e)
    }
});


/*** using dlocal ******/

router.post("/currency", async (req, res, next) => {
    try {
        const dlocalApiKey = process.env.DLOCAL_GO_API_KEY;    // Tu X-Login
        const dlocalSecretKey = process.env.DLOCAL_GO_SECRET_KEY; // Tu Secret para firmar

        // ¡IMPORTANTE! dLocal solo permite USD como base para este endpoint
        const from = "USD";
        const to = "CLP";
        const xDate = new Date().toISOString();

        // Verifica si estás en Sandbox o Producción según tus llaves
        const baseUrl = "https://api.dlocal.com"; // Cambiar a https://api.dlocal.com en producción
        const path = "/currency-exchanges";
        const url = `${baseUrl}${path}?from=${from}&to=${to}`;

        // Generar Firma: X-Login + X-Date + RequestBody (vacío en GET)
        const dataToSign = dlocalApiKey + xDate + "";
        const signature = crypto
            .createHmac('sha256', dlocalSecretKey)
            .update(dataToSign)
            .digest('hex');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Date': xDate,
                'X-Login': dlocalApiKey,
                'X-Trans-Key': dlocalApiKey, // Prueba usando tu API Key aquí también
                'X-Version': '2.1',
                'Content-Type': 'application/json',
                'Authorization': `V2-HMAC-SHA256, Signature: ${signature}`
            }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.get('/api/convert', async (req: Request, res: Response): Promise<any> => {
    // @ts-ignore
    const {from, to, amount} = req.query;

    const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

    if (!from || !to || !amount) {
        // @ts-ignore
        return res.status(400).json({error: "Missing parameters"});
    }

    try {
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

        // @ts-ignore
        return res.json({
            from: from,
            to: target,
            amount: Number(amount),
            convertedAmount: Number(convertedAmount.toFixed(2)),
            rate: rates[target],
            last_update: response.data.time_last_update_utc
        });

    } catch (error: any) {
        // @ts-ignore
        return res.status(500).json({error: "Failed to fetch exchange rates"});
    }
});

export default router;