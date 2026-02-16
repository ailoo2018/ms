import {getElClient, getProductCollectionsIndexName} from "../connections/el.js";


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
    index: getProductCollectionsIndexName(domainId),
    id: collectionId,
  });
  return {...response._source, id: response._id}
}

export async function buildQueryByCollectionId(criteria : any,  domainId: number) {
  const c = await fetchCollection(criteria.collectionId, domainId)
  if(c.name.toLowerCase() === "novedades"){
    c.createdDaysAgo = 45;
  }

  if(criteria.brands.length > 0){
    if(!c.brands)
      c.brands = []

    criteria.brands.forEach(b => c.brands.push({ id: b }))
  }

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


  if (criteria.sizes && criteria.sizes.length > 0) {
    must.push({
      terms: {
        "availableSizes.name.keyword": criteria.sizes,
      }
    })
  }
  if (criteria.colors && criteria.colors.length > 0) {
    must.push({
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
  if (criteria.models && criteria.models.length > 0) {
    must.push({
      terms: {
        "model.id": criteria.models,
      }
    })
  }

  /*{    range: {      quantityInStock: {gt: 0}    }  }*/

  if (c.brands && c.brands.length > 0) {
    must.push({
      terms: {
        "brand.id": c.brands.map(b => b.id),
      }
    })
  }

  let catIds = [...criteria.categories]

  if (c.categories && c.categories.length > 0) {
    c.categories.forEach(c => { catIds.push(c.id) })
  }

  if(catIds.length > 0) {
    must.push({
      terms: {
        "categories.id": catIds,
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

    let tagIds = []
    if(criteria.tags.length > 0)
      tagIds = [...criteria.tags]

    if (c.rules.some(r => r.type === EntityType.Tag)) {
      c.rules.filter(r => r.type === EntityType.Tag).forEach(r2 => { tagIds.push(r2.id) })
    }

    if(tagIds.length > 0) {
      must.push({
        terms: {
          "tags.id": tagIds,
        }
      })
    }

    if(c.createdDaysAgo > 0){
      c.rules.push({ type: EntityType.DaysAgo, numericValue: c.createdDaysAgo })
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
    must.push({
      term: {
        directCategoryisAvailableForInternet: true
      }
    })
  }



  if (must.length > 0) {
    query.bool.should.push({bool: {must: must}});
    must = []
  }

  let sort : any;

  sort = [];

  if(c.orderBy && c.orderBy.length > 0) {
    const orderBy = c.orderBy[0]

    const ob = {}

    let field = orderBy.field

    if(field.startsWith("name"))
      field = "fullName.keyword"
    else if(field.startsWith("bestsellers"))
      field = "unitsSold"
    else if(field.startsWith("newest")) {
      field = "createDate"
      orderBy.isAscending = false
    }

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

// module.exports = {buildQueryByCollectionId}