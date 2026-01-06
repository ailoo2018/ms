const {app} = require("../server");
const {getElClient, getProductCollectionsIndexName, getIndexName} = require("../el");
const {buildQueryByCollectionId} = require("../el/collections");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")


const ignore =
    [
      "a", "para", "como", "de", "con", "por", "hasta", "y"
    ]

function normalizeToken2(keyStr) {

  if (keyStr == null)
    return "";
  keyStr = keyStr.toLowerCase();
  keyStr = keyStr
      .replace("á", "a")
      .replace("é", "e")
      .replace("í", "i")
      .replace("ó", "o")
      .replace("ú", "u")
      .replace("ñ", "n")
      .replace(",", " ")
      .replace(".", "")
      .replace(",", " ")
      .replace("-", "")
  return keyStr.trim();

}

app.get("/:domainId/products/search", async (req, res, next) => {
  try {
    var {categoryId, brandId, collectionId, sword, limit, offset} = req.query;
    const domainId = parseInt(req.params.domainId);

    const categories = []
    const brands = []

    limit = limit ? parseInt(limit) : 60;
    offset = offset ? parseInt(offset) : 0;


    let sort = [{"brand.name.keyword": "asc"}, {'name.keyword': 'asc'}];
    let query = {
      bool: {
        must: [
          {term: {domainId: domainId}},
          {term: {isAvailableForInternet: true}},
          {range: {minPrice: {gt: 0}}},
          {range: {universalQuantity: {gt: 0}}},

        ]
      }
    }

    if (collectionId && collectionId !== "") {
      ({query: query, limit: limit, sort: sort} = await buildQueryByCollectionId(collectionId, domainId));
    } else {

      if (sword && sword.length > 0) {


        sword = normalizeToken2(sword.trim());
        const words = sword.split(' ');
        for (let i = 0; i < words.length; i++) {
          const theWord = words[i].trim()
          if (ignore.some(i => i === theWord))
            continue;

          if (words[i].trim().length > 0 && !words[i].endsWith("*") && !words[i].endsWith("\"")) {
            words[i] = "sword:'" + words[i] + "' OR sword:" + theWord + "*";
          }
          words[i] = "(" + words[i] + ")";
        }

        let s = words.join(" AND ")
        if (!s.endsWith("\"") && !s.endsWith("*") && !s.endsWith(")"))
          s += "*";


        query.bool.must.push({
          "query_string": {
            "query": s,

          }
        })


      }

      if (categoryId && categoryId.length > 0) {
        categories.push(parseInt(categoryId));
      }
      if (brandId && brandId.length > 0) {
        brands.push(parseInt(brandId));
      }

      if (categories.length > 0) {
        query.bool.must.push({
          terms: {
            "categories.id": categories,
          }
        })
      }
      if (brands.length > 0) {
        query.bool.must.push({
          terms: {
            "brand.id": brands,
          }
        })
      }


    }


    const aggs = {
      "brands_count": {
        "aggs": {
          "thits": {
            "top_hits": {
              "size": 1,
              "_source": {
                "includes": [
                  "brand.logo",
                  "brand.name",
                  "brand.id"
                ]
              }
            }
          }
        },
        "terms": {
          "field": "brand.id",
          "order": [
            {
              "_key": "asc"
            }
          ],
          "size": 100
        }
      },
      "categories_count": {
        "aggs": {
          "thits": {
            "top_hits": {
              "size": 1,
              "_source": {
                "includes": [
                  "categories.id"
                ]
              }
            }
          }
        },
        "terms": {
          "field": "categories.name.keyword",
          "order": [
            {
              "_key": "asc"
            }
          ],
          "size": 50
        }
      },
      "tags_count": {
        "terms": {
          "field": "tags.filter.keyword",
          "size": 200
        }
      },
      "sizes_count": {
        "terms": {
          "field": "availableSizes.id.keyword",
          "size": 200
        }
      },
      "tirespec_count": {
        "terms": {
          "field": "tireSpecs.tireSpec.keyword",
          "order": [
            {
              "_key": "asc"
            }
          ],
          "size": 200
        }
      },
      "motorcycle_count": {
        "aggs": {
          "motorcycle_count": {
            "terms": {
              "field": "motorcycles.motorcycle.keyword",
              "order": [
                {
                  "_key": "asc"
                }
              ],
              "size": 200
            }
          }
        },
        "nested": {
          "path": "motorcycles"
        }
      },
      "models_count": {
        "aggs": {
          "thits": {
            "top_hits": {
              "size": 1,
              "_source": {
                "includes": [
                  "model",
                  "brand.id",
                  "brand.name"
                ]
              }
            }
          }
        },
        "terms": {
          "field": "model.name.keyword",
          "order": [
            {
              "_key": "asc"
            }
          ],
          "size": 100
        }
      },
      "properties_count": {
        "terms": {
          "field": "properties.id.keyword",
          "order": [
            {
              "_key": "asc"
            }
          ],
          "size": 300
        }
      },
      "colors_count": {
        "aggs": {
          "colors_count": {
            "terms": {
              "field": "images.colorTagsIds",
              "size": 50
            }
          }
        },
        "nested": {
          "path": "images"
        }
      },
      "isnew_stats": {
        "stats": {
          "field": "isNew"
        }
      },
      "price_stats": {
        "stats": {
          "field": "maxPrice"
        }
      },
      "hasdiscounts_stats": {
        "stats": {
          "field": "hasDiscount"
        }
      }
    };


    const response = await getElClient().search({
      index: getIndexName(domainId),
      aggs: aggs,
      query: query,
      from: 0,
      size: limit,
      sort: sort,

    })

    var imgHelper = new ProductImageHelper()
    const products = response.hits.hits.map(h => {
      const p = {...h._source}

      p.url = getLink(p)
      p.coverImages = {
        "150": imgHelper.getUrl(p.image, 150, domainId),
        "300": imgHelper.getUrl(p.image, 300, domainId),
        "600": imgHelper.getUrl(p.image, 600, domainId),
        "800": imgHelper.getUrl(p.image, 800, domainId),

      }

      if (p.image) {
        p.imageUrl = imgHelper.getUrl(p.image, 300, domainId)
      }


      return p
    })

    const totalItems = response.hits.total.value;

    // process aggregates
    const filters = []
    for (var aggName in response.aggregations) {
      if (!aggName.includes("_count")) {
        continue;
      }
      if (!response.aggregations[aggName].buckets || response.aggregations[aggName].buckets.length == 0) {
        continue;
      }

      if (aggName.includes("tags_count")) {
        var filterByTags = processTags(response.aggregations[aggName])
        filterByTags.forEach(tag => filters.push(tag))
        continue;
      }


      const elBuckets = response.aggregations[aggName].buckets
      const filteredBuckets = []
      for (var b of elBuckets) {

        let data = {}
        let key = b.key
        let name = b.key;
        let total = 0;
        if (b.thits) {
          if(aggName.includes("brands")) {
            data = b.thits.hits.hits[0]._source.brand
          }

          if(data.name)
            name = data.name
        }
        total = b.doc_count


        filteredBuckets.push({
          id: key,
          name: name,
          total: total,
          data: data,
        })
      }


      filters.push({
        name: getFacetGroupName( aggName.replace("_count", "") ),
        buckets: filteredBuckets
      })
    }


    res.json({
      totalHits: totalItems,
      offset: 0,
      limit: limit,
      filters,
      products,
    })
  } catch (e) {
    next(e)
  }
})

const namesMap = {
  "brands": "Marcas",
  "models": "Modelos",
  "sizes": "Tallas",
  "colors": "Colores",
  "categories": "Categorías",
}


function getFacetGroupName(name){
  if(namesMap[name]){
    return namesMap[name]
  }
  return name
}


function processTags(tagCountAgg) {

  const groupBy = new Map()
  for (var b of tagCountAgg.buckets) {
    let filter = b.key
    if (!filter.includes("|True|")) {
      continue;
    }

    var arr = filter.split("|")
    if(arr.length !== 6) {
      continue;
    }

    let key = arr[0]
    let name = arr[1]
    let catName = arr[5]

    if (!groupBy.has(catName)) {
      groupBy.set(catName, {name: catName, buckets: []})
    }

    groupBy.get(catName).buckets.push({
      id: key,
      name: name,
      total: b.doc_count
    })


  }

  return [...groupBy.values()]
}

function startsWithNumbersAndHyphen2(text) {
  if (!text) return false;
  return /^\d+-/.test(text);
}

function getLink(product) {
  if (product.linkName && startsWithNumbersAndHyphen2(product.linkName)) {
    return "/motocicleta/" + product.linkName
  }

  return "/motocicleta/" + product.id + "-" + product.linkName
}