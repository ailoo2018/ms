import {Router} from "express";
import {listReviews,  reviewsStats} from "../db/reviews.js";


const router = Router(); // Create a router instead of using 'app'

router.get("/:domainId/reviews/list", async (req, res, next) => {
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

router.get("/:domainId/reviews/stats", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.query.productId);

    let avgRating = 0

    const rs = {
      "groups": [
  /*      {
          "totalReviews": 1,
          "ratingGroup": 5
        }*/
      ],
      "totalReviews": 0,
      "avgRating": 5.0
    }
    const reviews = await reviewsStats(productId, domainId)
    for (var review of reviews)
    {
      rs.groups.push({
        totalReviews: review.TotalReviews,
        ratingGroup: review.RatingGroup
      });

      rs.totalReviews += review.TotalReviews;

      avgRating += (review.RatingGroup * review.TotalReviews);
    }

    rs.avgRating = 0;
    if (avgRating > 0)
      rs.avgRating = avgRating / rs.totalReviews;


    res.json(rs)
  } catch (e) {
    next(e)
  }

})


export default router