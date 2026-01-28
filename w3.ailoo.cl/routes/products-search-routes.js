const {app} = require("../server");
const {getElClient, getProductCollectionsIndexName, getIndexName} = require("../connections/el");
const {buildQueryByCollectionId} = require("../el/collections");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")
const logger = require("@ailoo/shared-libs/logger")
const {search} = require("../el/search");
const container = require("../container");



app.get("/:domainId/products/collections/:collectionId", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId);
    let { collectionId, limit } = req.params;

    if(limit)
      limit = parseInt(limit);
    if(!limit)
      limit = 20

    const criteria = {
      collectionId: collectionId,
      categories: [],
      brands: [],
      tags: [],
      limit: limit,
      bike: null,
      offset: 0,
    }


    const sRs = await search(criteria, domainId)

    res.json(sRs)

  } catch (e) {
    next(e)
  }
})

const categoryService = container.resolve('productCategoryService');

app.get("/:domainId/products/search", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId);
    const {categoryId, brandId, collectionId, sword, limit, offset} = req.query;

    const criteria = {
      sword: rq.sword ? rq.sword : null,
      collectionId: rq.collectionId ? rq.collectionId : null,
      categories: [],
      brands: [],
      bike: rq.bike,
      tags: [],
      limit: limit ? limit : null,
      offset: offset ? offset : null,
    }

    if (categoryId && categoryId.length > 0)
      criteria.categories.push(parseInt(categoryId));

    if (brandId && brandId.length > 0)
      criteria.brands.push(parseInt(brandId));

    const sRs = await search(criteria, domainId)


    res.json(sRs)

  } catch (e) {
    next(e)
  }
})


app.post("/:domainId/products/search", async (req, res, next) => {
  try {
    // var {categoryId, brandId, collectionId, sword, limit, offset} = req.query;
    var rq = req.body;
    const domainId = parseInt(req.params.domainId);

    let limit = rq.limit ? parseInt(rq.limit) : 60;
    let offset = rq.offset ? parseInt(rq.offset) : 0;


    const criteria = {
      sword: rq.sword ? rq.sword : null,
      collectionId: rq.collectionId ? rq.collectionId : null,
      categories: [],
      colors: [],
      brands: [],
      sizes: [],
      tags: [],
      limit: limit,
      offset: offset,
    }


    if (rq.categoryId && rq.categoryId.length > 0)
      criteria.categories.push(parseInt(rq.categoryId));
    else if (rq.categories)
      criteria.categories = rq.categories;

    if (rq.brandId && rq.brandId.length > 0)
      criteria.brands.push(parseInt(rq.brandId));
    else if (rq.brands)
      criteria.brands = rq.brands;

    if(rq.minDiscount)
      criteria.minDiscount = parseInt(rq.minDiscount);
    if (rq.tags)
      criteria.tags = rq.tags;
    if (rq.sizes)
      criteria.sizes = rq.sizes;
    if (rq.models)
      criteria.models = rq.models;
    if (rq.colors)
      criteria.colors = rq.colors;
    if (rq.bike)
      criteria.bike = rq.bike;


    const sRs = await search(criteria, domainId)

    if(!sRs.query)
      sRs.query = {};

    if(rq.categories && rq.categories.length > 0){
      const catId = parseInt(rq.categories[0]);
      const category = await categoryService.findCategory(catId, domainId)

      sRs.query.category = { id: category.id, name: category.name, linkName: category.linkName };
    }

    if(rq.sword){
      sRs.query.sword = rq.sword
    }

    res.json(sRs)
  } catch (e) {
    next(e)
  }
})

