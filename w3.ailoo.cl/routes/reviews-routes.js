const {app} = require("../server");
const {productReviews, listReviews} = require("../db/reviews");


app.get("/:domainId/reviews/list", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const {
      productId,
      rating,
      orderBy,
      orderDir,
      limit,
      offset,
    } = req.query

    const rows = await listReviews({productId, rating, orderBy, orderDir, limit, offset}, domainId)

    res.json({
      "reviews": rows.map(r => {
        return {
          "comment": r.Comment,
          "rating": r.Rating,
          "id": r.Id,
          "date": r.Date,
          "likes": r.Likes,
          "dislikes": r.Dislikes,
          "model": r.ModelName,
          "modelId": r.ModelId,
          "user": r.Username,
          "party": {
            "id": r.PartyId,
            "name": r.PartyName
          }
        };
      })


    })
  } catch (e) {
    next(e)
  }

})

app.get("/:domainId/reviews/stats", async (req, res, next) => {

  try {

    res.json({
      "groups": [
        {
          "totalReviews": 1,
          "ratingGroup": 5
        }
      ],
      "totalReviews": 1,
      "avgRating": 5.0
    })
  } catch (e) {
    next(e)
  }

})