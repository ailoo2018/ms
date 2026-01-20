const {getElClient, getProductCollectionsIndexName} = require("../connections/el");

const EntityType = Object.freeze({
  Unknown: 0,
  Brand: 1,
  Model: 2,
  Product: 3,
  Tag: 4,
  Category: 5,
  Color: 6,
  Size: 7,
  DaysAgo: 8,
  MinDiscount: 9,
  MinPrice: 10,
  MaxPrice: 11,
  AvailableForInternet: 12
});

async function fetchCollection(collectionId, domainId) {

  const response = await getElClient().get({
    index: getProductCollectionsIndexName(),
    id: collectionId,
  });
  return {...response._source, id: response._id}
}

async function buildQueryByCollectionId(collectionId, domainId) {
  const c = await fetchCollection(collectionId)


  let query = {
    bool: {
      should: []
    }
  }


  let must = []

  must.push({
        term: {
          domainId: domainId,
        },
      },

  )
  /*{    range: {      quantityInStock: {gt: 0}    }  }*/

  if (c.brands && c.brands.length > 0) {
    must.push({
      terms: {
        "brand.id": c.brands.map(b => b.id),
      }
    })
  }
  if (c.categories && c.categories.length > 0) {
    must.push({
      terms: {
        "categories.id": c.categories.map(b => b.id),
      }
    })
  }

  if (c.rules) {

    if (c.rules.some(r => r.type === EntityType.Category)) {
      must.push({
        terms: {
          "categories.id": c.rules.filter(r => r.type === EntityType.Category).map(r => r.id),
        }
      })
    }

    if (c.rules.some(r => r.type === EntityType.Product)) {
      must.push({
        terms: {
          "id": c.rules.filter(r => r.type === EntityType.Product).map(r => r.id),
        }
      })
    }

    const crDateRule = c.rules.find(r => r.type === EntityType.DaysAgo)
    if (crDateRule) {
      must.push({
        range: {
          createDate: {
            gte: `now-${crDateRule.numericValue}d/d`,
          }
        }
      })
    }


    const dctRule = c.rules.find(r => r.type === EntityType.MinDiscount)
    if (dctRule) {
      must.push({
        range: {
          discountPercent: {
            gte: dctRule.numericValue,
          }
        }
      })
    }
  }

  const r = c.rules.find(r => r.type === EntityType.AvailableForInternet)
  if (true || (r && r.numericValue === 1)) {
    must.push({
      range: {
        minPrice: {gt: 0}
      }
    })
    must.push({
      range: {
        universalQuantity: {gt: 0}
      }
    })
    must.push({
      term: {
        isAvailableForInternet: true
      }
    })
  }


  if (must.length > 0) {
    query.bool.should.push({bool: {must: must}});
    must = []
  }

  let sort = [];

  if(c.orderBy && c.orderBy.length > 0) {
    const orderBy = c.orderBy[0]

    const ob = {}

    let field = orderBy.field
    if(field.startsWith("name"))
      field = "fullName.keyword"
    if(orderBy.field.includes(":asc")){
      orderBy.isAscending = true
    }

    ob[field] = {
      "order": orderBy.isAscending ? "asc": "desc",
    }
    sort = ob

  }else if(c.sort && c.sort.length > 0) {
    if (c.sort === "bestsellers") {
      sort.push({
        "unitsSold": {"order": "desc"}
      })
    }
  }else {
    sort = [{"brand.name.keyword": "asc"}, {"name.keyword": "asc"}]
  }


  return {query, limit:  10, sort, collection: c};
}

module.exports = {buildQueryByCollectionId}