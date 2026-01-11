const {app} = require("../server");
const CartRepos = require("../el/cart");


app.get("/comunas/search", async (req, res, next) => {

  try{
    const { sword } = req.query


    const baseUrl = process.env.GEO_URL
    const geoRes = await fetch(`${baseUrl}/comunas/search`, {
      method: "GET",
      headers: {
        ContentType: "application/json",
        Accept: "application/json",
      },
      query: {
        sword,
      }
    })

    res.json(geoRes)


  }catch(err){
    next(err);
  }

})
