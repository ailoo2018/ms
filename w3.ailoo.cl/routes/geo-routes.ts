import { Router } from "express";
const router = Router();

router.get("/comunas/search", async (req, res, next) => {
  try {
    const { sword } = req.query;

    const baseUrl = process.env.GEO_URL;

    // Build URL with query parameters
    const url = new URL(`${baseUrl}/comunas/search`);
    if (sword) {
      url.searchParams.append('sword', sword as string);
    }

    const geoRes = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      }
    });

    const data = await geoRes.json();
    res.json(data);

  } catch (err) {
    next(err);
  }
});

export default router;