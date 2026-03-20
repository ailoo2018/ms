import {Router} from "express";
import {listReviews,  reviewsStats} from "../db/reviews.js";
import container from "../container/index.js";


const router = Router(); // Create a router instead of using 'app'

router.get("/:domainId/reviews/list", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const {
      productId,
      modelId,
      rating,
      orderBy,
      orderDir,
      limit,
      offset,
    } = req.query

    const { rows, total } : any = await listReviews({productId, modelId, rating, orderBy, orderDir, limit, offset}, domainId)

     var pids = rows.map(r => r.ProductId);
    const productService = container.resolve('productsService');
    const products = await productService.findProducts(pids, domainId);

    const map = new Map()

    products.forEach(p => { map.set(p.id, p) })



    res.json({
      total: total,
      offset: offset,
      limit: limit,
      "reviews": rows.map(r => {


        let product= null;
        if(map.has(r.ProductId))
          product = map.get(r.ProductId)

        let configuration = null
        if(r.Config?.length > 0){
          configuration = JSON.parse(r.Config)
        }

        return {
          comment: r.Comment,
          rating: r.Rating,
          id: r.Id,
          date: r.Date,
          "likes": r.Likes,
          "dislikes": r.Dislikes,
          "model": r.ModelName,
          "modelId": r.ModelId,
          user: r.Username,
          party: {
            "id": r.PartyId,
            "name": r.PartyName
          },
          configuration,
          product: product ? {
            id: product.id,
            image: product.image,
            name: product.name,
            brand: product.brand,
            fullName: product.fullName,
          } : null,

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
    const modelId = req.query.modelId || 0

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
    const reviews: any = await reviewsStats(productId, modelId, domainId)
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