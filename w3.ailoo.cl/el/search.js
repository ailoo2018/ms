const {buildQueryByCollectionId} = require("./collections");
const {getElClient, getIndexName} = require("../connections/el");
const ProductImageHelper = require("../../packages/shared-libs/helpers/ProductImageHelper");
const logger = require("@ailoo/shared-libs/logger");

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
    "nested": {
      "path": "parentCategories"
    },
    "aggs": {
      "categories_count": {
        "terms": {
          "field": "parentCategories.id",
          "size": 200
        },
        "aggs": {
          "categories_metadata": {
            "top_hits": {
              "size": 1,
              "_source": {
                "includes": [
                  "parentCategories.name"
                ]
              }
            }
          }
        }
      }
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
      "field": "availableSizes.key.keyword",
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


function buildQueryByCriteria(criteria, domainId) {
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
  if (criteria.sword && criteria.sword.length > 0) {
    let sword = criteria.sword;

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


  if (criteria.categories && criteria.categories.length > 0) {
    query.bool.must.push({
      terms: {
        "categories.id": criteria.categories,
      }
    })
  }
  if (criteria.brands && criteria.brands.length > 0) {
    query.bool.must.push({
      terms: {
        "brand.id": criteria.brands,
      }
    })
  }
  if (criteria.models && criteria.models.length > 0) {
    query.bool.must.push({
      terms: {
        "model.id": criteria.models,
      }
    })
  }
  if (criteria.tags && criteria.tags.length > 0) {
    query.bool.must.push({
      terms: {
        "tags.id": criteria.tags,
      }
    })
  }
  if (criteria.products && criteria.products.length > 0) {
    query.bool.must.push({
      terms: {
        "id": criteria.products,
      }
    })
  }

  if (criteria.sizes && criteria.sizes.length > 0) {
    query.bool.must.push({
      terms: {
        "availableSizes.name.keyword": criteria.sizes,
      }
    })
  }
  if (criteria.colors && criteria.colors.length > 0) {
    query.bool.must.push({
      "nested": {
        "path": "images",
        "query": {
          "terms": {
            "images.colorTagsIds": criteria.colors
          }
        }
      }
    })
  }

  return query
}


function processNormalAggs(aggs, aggName) {
  if (!aggs.buckets) {
    return null
  }
  let elBuckets = aggs.buckets
  const filteredBuckets = []
  for (var b of elBuckets) {

    let data = {}
    let key = b.key
    let name = b.key;
    let total = b.doc_count;
    if (b.thits) {
      data = b.thits.hits.hits[0]._source.brand

      if (data.name)
        name = data.name
    }


    filteredBuckets.push({
      id: key,
      name: name,

      total: total,
      data: data,
    })
  }

  return {
    name: getFacetGroupName(aggName.replace("_count", "")),
    type: aggName.replace("_count", ""),
    buckets: filteredBuckets.sort((a, b) => (a.name + "").localeCompare(b.name + ""))
  };
}

function processSizes(aggs) {
  let elBuckets = aggs.buckets
  let filteredBuckets = []
  for (var b of elBuckets) {

    try {
      const arr = b.key.split("|")

      if (filteredBuckets.some(fb => fb.name.toLowerCase() === arr[0].toLowerCase())) {
        continue
      }

      filteredBuckets.push({
        id: arr[0],
        name: arr[0],
        orderWeight: parseInt(arr[1]),
        total: b.doc_count,
        data: {}
      })
    } catch (err) {
      logger.error("unable to process size " + JSON.stringify(b))
    }
  }
  return {
    name: "Tallas",
    type: "sizes",
    buckets: filteredBuckets.sort((a, b) => (a.orderWeight > b.orderWeight ? 1 : -1))
  };

}


const colorMap = new Map([
  [1, {code: "black", description: "Negro", tagCategoryId: 1, hex: "#000000"}],
  [2, {code: "brown", description: "Cafe", tagCategoryId: 1, hex: "#a52a2a"}],
  [3, {code: "white", description: "Blanco", tagCategoryId: 1, hex: "#ffffff"}],
  [4, {code: "red", description: "Rojo", tagCategoryId: 1, hex: "#ff0000"}],
  [5, {code: "silver", description: "Plateado", tagCategoryId: 1, hex: "#c0c0c0"}],
  [6, {code: "blue", description: "Azul", tagCategoryId: 1, hex: "#0000ff"}],
  [7, {code: "gray", description: "Gris", tagCategoryId: 1, hex: "#808080"}],
  [8, {code: "yellow", description: "Amarillo", tagCategoryId: 1, hex: "#ffff00"}],
  [9, {code: "green", description: "Verde", tagCategoryId: 1, hex: "#00ff00"}],
  [10, {code: "pink", description: "Rosado", tagCategoryId: 1, hex: "#ffc0cb"}],
  [11, {code: "orange", description: "Naranjo", tagCategoryId: 1, hex: "#ffa500"}],
  [12, {code: "gold", description: "Dorado", tagCategoryId: 1, hex: "#ffd700"}],
  [13, {code: "purple", description: "Purpura", tagCategoryId: 1, hex: "#800080"}],
  [2058, {code: "sky_blue", description: "Celeste", tagCategoryId: 1, hex: "#ADD8E6"}]
]);

function processColors(aggs) {
  let elBuckets = aggs.colors_count.buckets
  let filteredBuckets = []
  for (var b of elBuckets) {

    try {
      const color = colorMap.get(b.key)


      filteredBuckets.push({
        id: b.key,
        name: color.description,
        code: color.code,
        hex: color.hex,
        total: b.doc_count,
      })
    } catch (err) {
      logger.error("unable to process size " + JSON.stringify(b))
    }
  }
  return {name: "Colores", type: "colors", buckets: filteredBuckets};

}

function processModels(aggs) {
  let elBuckets = aggs.buckets
  let filteredBuckets = []
  for (var b of elBuckets) {

    try {
      var model = b.thits.hits.hits[0]._source.model
      var brand = b.thits.hits.hits[0]._source.brand


      filteredBuckets.push({
        id: model.id,
        name: brand.name + " " + model.name,
        total: b.doc_count,
        data: {}
      })
    } catch (err) {
      logger.error("unable to process size " + JSON.stringify(b))
    }
  }
  return {name: "Modelos", type: "models", buckets: filteredBuckets.sort((a, b) => a.name.localeCompare(b.name))};

}

function processCategories(aggs) {
  let elBuckets = aggs.categories_count.buckets
  let filteredBuckets = []
  for (var b of elBuckets) {

    let name = b.categories_metadata.hits.hits[0]._source.name

    filteredBuckets.push({
      id: b.key,
      name: name,
      total: b.doc_count,
      data: {}
    })
  }
  return {name: "Categorías", type: "categories", buckets: filteredBuckets};

}

const namesMap = {
  "brands": "Marcas",
  "models": "Modelos",
  "sizes": "Tallas",
  "colors": "Colores",
  "categories": "Categorías",
}


function getFacetGroupName(name) {
  if (namesMap[name]) {
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
    if (arr.length !== 6) {
      continue;
    }

    let key = arr[0]
    let name = arr[1]
    let catName = arr[5]

    if (!groupBy.has(catName)) {
      groupBy.set(catName, {name: catName, type: "tags", buckets: []})
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


async function search(criteria, domainId) {

  let query
  let limit

  let sort = [{"brand.name.keyword": "asc"}, {'name.keyword': 'asc'}];
  if (criteria.collectionId && criteria.collectionId !== "") {
    ({query: query, limit: limit, sort: sort} = await buildQueryByCollectionId(criteria.collectionId, domainId));
    if(criteria.limit > 0)
      limit = criteria.limit
  } else {
    query = buildQueryByCriteria(criteria, domainId);
    limit = criteria.limit ? parseInt(criteria.limit) : 60;
  }


  let offset = criteria.offset ? parseInt(criteria.offset) : 0;


  const response = await getElClient().search({
    index: getIndexName(domainId),
    aggs: aggs,
    query: query,
    from: offset,
    size: limit,
    sort: sort,
    _source: {
      excludes: [
        "categories",
        "parentCategories",
        "features",
        "sword",
        "properties",
        "propertiesMap",
        "productItems",
        "motorcycles", "model", "tags", "priceComponents", "discounts", "salesTaxes", "googleProductCategory",
        "departments", "mercadoLibre", "summary"
      ]
    }

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
    p.price = {
      discount: 0,
      price: p.minPrice,
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

    if (aggName.includes("tags_count")) {
      const filterByTags = processTags(response.aggregations[aggName])
      filterByTags.forEach(tag => filters.push(tag))

    } else if (aggName.includes("categories_count")) {
      filters.push(processCategories(response.aggregations[aggName]))

    } else if (aggName.includes("sizes_count")) {
      filters.push(processSizes(response.aggregations[aggName]))

    } else if (aggName.includes("colors_count")) {
      filters.push(processColors(response.aggregations[aggName]))

    } else if (aggName.includes("models_count")) {
      filters.push(processModels(response.aggregations[aggName]))

    } else {
      const ret = processNormalAggs(response.aggregations[aggName], aggName);


      if (ret && ret.buckets.length > 0)
        filters.push(ret)

    }
  }

  return {
    totalHits: totalItems,
    offset: offset,
    limit: limit,
    filters,
    products,
  }

}

module.exports = {search}