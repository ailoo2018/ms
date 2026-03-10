import {db as redisDb} from "../connections/rdb.js";
import axios from "axios";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;


export interface ExchangeRateResponse {
    result:                string;
    documentation:         string;
    terms_of_use:          string;
    time_last_update_unix: number;
    time_last_update_utc:  string;
    time_next_update_unix: number;
    time_next_update_utc:  string;
    base_code:             string;
    conversion_rates:      ConversionRates;
}

export interface ConversionRates {
    // This allows any 3-letter currency code as a key
    [currencyCode: string]: number;
}


export async function allCurrencies(from: string) : Promise<ExchangeRateResponse>{
    const exchangeRateStr : any = await redisDb.get(`currency:all:` + from);
    if(exchangeRateStr){
        return JSON.parse(exchangeRateStr)
    }

    const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${from}`;
    const response = await axios.get(url);

    const data = response.data
    await redisDb.set(`currency:all:` + from, JSON.stringify(data), { EX: 2 * 60 * 60})

    return data
}

export async function convert(amount : number, from: string, to: string){
    const data = await allCurrencies(from);

    return amount * data.conversion_rates[to]
}

export const COUNTRY_DATA = {
    AR: { name: 'Argentina',      currency: 'ARS', symbol: '$',   flag: '🇦🇷', iso: "ar", hasDecimals: false },
    BO: { name: 'Bolivia',        currency: 'BOB', symbol: 'Bs.', flag: '🇧🇴', iso: "bo" },
    BR: { name: 'Brasil',         currency: 'BRL', symbol: 'R$',  flag: '🇧🇷', iso: "br" },
    CL: { name: 'Chile',          currency: 'CLP', symbol: '$',   flag: '🇨🇱', iso: "cl", hasDecimals: false },
    CO: { name: 'Colombia',       currency: 'COP', symbol: '$',   flag: '🇨🇴', iso: "co" },
    CR: { name: 'Costa Rica',     currency: 'CRC', symbol: '₡',   flag: '🇨🇷', iso: "cr" },
    EC: { name: 'Ecuador',        currency: 'USD', symbol: '$',   flag: '🇪🇨', iso: "ec" },
    SV: { name: 'El Salvador',    currency: 'USD', symbol: '$',   flag: '🇸🇻', iso: "sv" },
    ES: { name: 'España',         currency: 'EUR', symbol: '€',   flag: '🇪🇸', iso: "es" },
    US: { name: 'Estados Unidos', currency: 'USD', symbol: '$',   flag: '🇺🇸', iso: "us", hasDecimals: true },
    GT: { name: 'Guatemala',      currency: 'GTQ', symbol: 'Q',   flag: '🇬🇹', iso: "gt" },
    HN: { name: 'Honduras',       currency: 'HNL', symbol: 'L',   flag: '🇭🇳', iso: "hn" },
    MX: { name: 'México',         currency: 'MXN', symbol: '$',   flag: '🇲🇽', iso: "mx" },
    NI: { name: 'Nicaragua',      currency: 'NIO', symbol: 'C$',  flag: '🇳🇮', iso: "ni" },
    PA: { name: 'Panamá',         currency: 'PAB', symbol: 'B/.', flag: '🇵🇦', iso: "pa" },
    PY: { name: 'Paraguay',       currency: 'PYG', symbol: '₲',   flag: '🇵🇾', iso: "py" },
    PE: { name: 'Perú',           currency: 'PEN', symbol: 'S/',  flag: '🇵🇪', iso: "pe" },
    PR: { name: 'Puerto Rico',    currency: 'USD', symbol: '$',   flag: '🇵🇷', iso: "pr" },
    DO: { name: 'República Dominicana', currency: 'DOP', symbol: 'RD$', flag: '🇩🇴', iso: "do" },
    UY: { name: 'Uruguay',        currency: 'UYU', symbol: '$',   flag: '🇺🇾', iso: "uy" },
    VE: { name: 'Venezuela',      currency: 'VES', symbol: 'Bs.', flag: '🇻🇪', iso: "ve" },
}

export interface Country {
    name: string;
    currency: string;
    symbol: string;
    flag: string;
    iso: string;
    hasDecimals?: boolean; // Optional property
}

export function getCountryData(code: string) : Country{
    return COUNTRY_DATA[code]
}