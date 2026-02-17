import router from "./wcc-routes.js";
import { db as redisDb } from "../connections/rdb.js";

const CHANNEL_ID = 'UClkc3m-0-ZFIqf1gBymlcUA';
const API_KEY = process.env.YOUTUBE_API_KEY;
const CACHE_KEY = `yt_latest_${CHANNEL_ID}`;
const CACHE_TTL = 60 * 60 * 10; // 10 hours in seconds

router.get('/:domainId/yt/latest', async (req, res, next) => {
    try {
        // 1. Try to get data from Redis
        const cachedData = await redisDb.get(CACHE_KEY);

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // 2. If no cache, fetch fresh data
        // Note: Using standard fetch URLSearchParams for the query
        const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=10&type=video`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`YouTube API responded with ${response.status}`);
        }

        const videos = await response.json();

        // 3. Store the result in Redis with 10-hour expiration (EX)
        // We stringify the JSON because Redis stores strings/buffers
        await redisDb.set(CACHE_KEY, JSON.stringify(videos), {
            EX: CACHE_TTL
        });

        res.json(videos);
    } catch (err) {
        res.json({
            items: [
                {
                    "kind": "youtube#searchResult",
                    "id": {
                        "kind": "youtube#video",
                        "videoId": "pzskeHJx9wI"
                    },
                    "snippet": {
                        "publishedAt": "2023-11-15T18:30:00Z",
                        "channelId": "UClkc3m-0-ZFIqf1gBymlcUA",
                        "title": "ARAI QUANTIC - CASCO PREMIUM SPORT – TOURING / Disponible en motomundi.cl",
                        "description": "¿Deseas leer los detalles del producto o incluso comprarlo? " +
                            "Revisa el siguiente link:",
                        "thumbnails": {
                            "high": {
                                "url": "https://i.ytimg.com/vi/pzskeHJx9wI/hqdefault.jpg",
                                "width": 480,
                                "height": 360
                            }
                        },
                        "channelTitle": "Your Channel Name",
                        "liveBroadcastContent": "none"
                    }
                },
                {
                    "kind": "youtube#searchResult",
                    "id": {
                        "kind": "youtube#video",
                        "videoId": "yrNCLEo-pSc"
                    },
                    "snippet": {
                        "publishedAt": "2023-11-15T18:30:00Z",
                        "channelId": "UClkc3m-0-ZFIqf1gBymlcUA",
                        "title": "¿Qué llevo en mis bolsos? Te presento TODO mi EQUIPAJE durante mi viaje por PATAGONIA",
                        "description": "En este video te presento todo mi equipaje. Considero que viajo con poco ¿Qué crees tú? También te comparto todo mi equipo de filmación.\n" +
                            "Saludos desde la Patagonia, junto a La Indomable, mi Royal Enfield Himalayan 450. Acá, haciendo los km pendientes.",
                        "thumbnails": {
                            "high": {
                                "url": "https://i.ytimg.com/vi/yrNCLEo-pSc/hqdefault.jpg",
                                "width": 480,
                                "height": 360
                            }
                        },
                        "channelTitle": "Your Channel Name",
                        "liveBroadcastContent": "none"
                    }
                },
                {
                    "kind": "youtube#searchResult",
                    "id": {
                        "kind": "youtube#video",
                        "videoId": "89z2_Mve3Go"
                    },
                    "snippet": {
                        "publishedAt": "2023-11-15T18:30:00Z",
                        "channelId": "UClkc3m-0-ZFIqf1gBymlcUA",
                        "title": "¡Juguete para niños grandes! 🚀 S1000RR 2026 Chile | Review",
                        "description": "Una moto que es más allá de un sueño, para muchos la moto definitiva y el tope de gama de una marca con un nivel altísimo de ingeniería, la S1000RR nos sorprendió! es mucho más que una superbike extrema, te entrega sensaciones para todo tipo de usos y en este video la probamos unos días como si fuese nuestra moto! ",
                        "thumbnails": {
                            "high": {
                                "url": "https://i.ytimg.com/vi/89z2_Mve3Go/hqdefault.jpg",
                                "width": 480,
                                "height": 360
                            }
                        },
                        "channelTitle": "Your Channel Name",
                        "liveBroadcastContent": "none"
                    }
                }
                ]
        })
    }
});

export default router;