import {Router} from "express";
import {getElClient, getProductCollectionsIndexName} from "../connections/el.js";

const router = Router();



function getIndexName(domainId){
  return "rewrite"
}

router.post("/:domainId/friendly-url/lookup", async (req, res, next) => {
  var domainId = req.params.domainId;
  var categoryId = req.params.id;
  try {
    const rq = req.body

    var url = rq.url
    if(rq.url.startsWith('/')){
      url = rq.url.substring(1)
    }

    const query =  {
      "bool": {
        "must": [
          {
            "term" : {
              "friendlyUrl.keyword" : url
            }

          },
          {
            "term": {
              "domainId" : domainId,
            }
          }
        ]
      }

    }



    const response = await getElClient().search(
        {
          index: getIndexName(domainId),
          body: {
            query: query,
            from: 0,
            size: 1
          }
        }
    )

    let ret: any = {}
    if(response.hits.hits.length > 0){
      const route =response.hits.hits[0]._source
      const queryString = route.rawUrl.split('?')[1];
      const params = new URLSearchParams(queryString);

      ret = {routeId: route.id, query: {...Object.fromEntries(params.entries())} }


      if(route.rawUrl && route.rawUrl.toLowerCase().includes("product/listbycategory")){
        ret.path = "/product/list"
      }
      if(route.rawUrl && route.rawUrl.toLowerCase().includes("blog/view")){
        ret.path = "/blog/view"
      }
      ret.source = route

      res.json(ret)
    }else{

      var collRs = await getElClient().search({
        index: getProductCollectionsIndexName(domainId),
        query:  {
          "bool": {
            "must": [
              {
                "term": {
                  "url.keyword": url.toLowerCase(),
                }
              },
              {
                "term": {
                  "domainId": domainId
                }
              }
            ]
          }
        }
      })

      if(collRs.hits.hits.length > 0){
        var c = collRs.hits.hits[0]._source;
        res.json({
          "collectionId": collRs.hits.hits[0]._id,
          "query": {
            "collection": collRs.hits.hits[0]._id,
          },
          "path": "/product/list",
          "source": null,
        })
      }

      return res.status(404).json({
        error: "route not found"
      });
    }

  } catch (e) {
    next(e);
  }

});


export default router;