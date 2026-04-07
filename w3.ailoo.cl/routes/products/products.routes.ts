import { Router } from "express";
import ProductImageHelper from "@ailoo/shared-libs/helpers/ProductImageHelper";
import {search} from "../../el/search.js";
import { SaleType} from "../../models/domain.js";
import {
  findProduct,
  getLink,
  getProductItemDescription,
  getProductSalesRules,
  isApplicableSalesRule
} from "../../helpers/product-helper.js";
import {getElClient, getIndexName} from "../../connections/el.js";
import container from "../../container/index.js";
import {stockAllStores} from "../../db/inventory.js";
import logger from "@ailoo/shared-libs/logger";
import {SizeChartService} from "@ailoo/shared-libs/SizeChartService";
import cmsClient from "../../services/cmsClient.js";
import {currencyHandler} from "../../server.js";
import {productComplements} from "../../db/product.js";
import {productCacheKey} from "../../utils/cache-utils.js";
import { db as redisDb } from "../../connections/rdb.js";
import sgMail from "../../connections/sendmail.js";
import {fileURLToPath} from "url";
import path from "path";
import {promises as fs} from "fs";
import ejs from "ejs";
import parametersClient from "../../services/parametersClient.js";
import {createKommoLead} from "../../models/kommo.types.js";
const router = Router();
const productService = container.resolve('productsService');
const cartService = container.resolve('cartService');
const sizeChartService = container.resolve('sizeChartService') as SizeChartService;
const CACHE_TTL = 60 * 60 * 12;

router.post("/:domainId/seen-cheaper", async (req, res, next) => {
  try{
    const domainId = parseInt(req.params.domainId);

    const rq = req.body;

    if(!rq.productId)
      return res.status(400).send({ message: "ProductId not received"})

    const p = await productService.findProduct(rq.productId, domainId)
    const pit = p.productItems.find(pi => pi.colorId === rq.color && pi.sizeId == rq.size)
    const desc = getProductItemDescription(p, pit)

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join( __dirname, "../..", 'templates', 'seen-cheaper.ejs');
    // const templatePath = path.join(process.cwd(), '/templates/recover-account.ejs');
    const template = await fs.readFile(templatePath, 'utf-8');

    const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
    let logo = logoParam ? logoParam.value : {};

    const html = ejs.render(template, {
      name: rq.name,       // ← add this
      price: rq.price,     // ← add this too (used in formatMoney)
      product: p,
      productItem: pit,
      productName: desc,
      size: p.features?.find(f => f.id === pit.sizeId)?.name || null,
      color: p.features?.find(f => f.id === pit.colorId)?.name || null,
      url: rq.url,
      phone: rq.phone,
      email: rq.email,
      unsubscribeUrl: "https://www.motomundi.cl",
      formatHelper: {
        toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
        formatMoney: (amount) => `$${amount.toLocaleString()}`,
        encodeUrl: (str) => encodeURIComponent(str)
      },
      domain: {id: 1, name: "MotoMundi", party: {name: "MotoMundi SPA"}},
      domainHelper: {
        getLogo: () => logo,
        getSiteRoot: () => 'https://www.motomundi.cl'
      },

      webSite: {
        templateInstance: {
          getConfigValue: key => {
            if(key === "facebook-url"){
              return "https://www.facebook.com/motomundi.la"
            }
            if(key === "instagram-url"){
              return "https://www.instagram.com/motomundi"
            }
            if(key === "youtube-url"){
              return "https://www.youtube.com/motomunditv"
            }
            if(key === "tiktok-url"){
              return "https://www.tiktok.com/motomundicl"
            }
            return "";
          }
        }
      }
    });


    const email = rq.email;
    const rs = await sgMail.send({
      to: email,
      bcc: ["jcfuentes@motomundi.cl", "edson@motomundi.cl", "rcachana@motomundi.cl"],
      from: 'ventas@motomundi.cl', // Change to your verified sender
      subject: `🏷️ Solicitud de precio mínimo recibida — te contactamos pronto`,
      html: html,
    })

    res.json(rs)

  }catch(e){
    next(e)
  }
})

router.get("/:domainId/products/stock", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const productItemId = parseInt(req.query.productItemId)

    const stock : any = await stockAllStores(productItemId, domainId)

    res.json({
      "stores": stock.map(s => {
        return {
          "name": s.FacilityName,
          "address": s.Address + ", " + s.ComunaName,
          "stock": s.Quantity,
          "allowPickup": s.AllowPickup === 1,
          "pickup": "Recogelo en 2 horas"

        }
      })
    });


  } catch (e) {
    next(e);
  }
})

router.get("/:domainId/products/find-by-pit/:id", async (req, res, next) => {

  try {

    const domainId = parseInt(req.params.domainId);
    const id = parseInt(req.params.id)

    const p = await productService.findProductByProductItem(id, domainId);


    res.json(p);
  } catch (e) {
    next(e)
  }
})

router.get("/:domainId/products/:productId/create-images", async (req, res, next) => {

  try {
    console.log("create product images")

    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.params.productId)
    const p = await findProduct(productId, domainId);

    if (!p.images) {
      return res.json({})
    }

    const result = []
    for (var img of p.images) {
      const imgRs = await fetch(`${process.env.PRODUCTS_MS_URL}/${domainId}/cdn/images/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // Usually required for POST bodies
        },
        body: JSON.stringify({
          imageId: img.image,
          sizes: [50, 150, 300, 600, 800]
        })
      })
      const imgRsJs = await imgRs.json()

      result.push(imgRsJs)
    }


    res.json({results: result});
  } catch (e) {
    next(e)
  }
})

router.post("/:domainId/products/list", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const  ids  = req.body.ids;

    const products = await productService.findProducts(ids, domainId);


    res.json({
      products: products
    })

  }catch(e){
    next(e);
  }
})

router.get("/:domainId/products/:productId", currencyHandler, async (req, res, next) => {
  try {
    const currency = req.currency || "CLP"
    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.params.productId)
    const force = req.query.force === "true" || false;

    if (!productId || Number.isNaN(productId)) {
      return res.status(404).json({ message: "product not found" })
    }

    const cachedData = await redisDb.get(productCacheKey(productId, domainId));



    if (!force && cachedData?.length > 0) {
      const p = JSON.parse(cachedData.toString());
      logger.info(`find product: ${productId} ${p.name} origin: redis`);
      p.origin = "redis"
      return res.json(p);
    }

    const dbStart = Date.now(); // <-- start timer after cache miss

    const p = await findProduct(productId, domainId, currency);
    if (!p)
      return res.status(404).json({ message: "product not found" })

    try {
      const charts = await sizeChartService.findAllThatApplyToProduct(p, domainId)
      p.sizeChart = null
      if (charts && charts.length > 0) {
        p.sizeChart = charts[0]
      }
    } catch (e) {
      logger.error("Error trying to recover size chart. Will continue process")
    }

    const blogContent = await cmsClient.findBlogEntriesByProduct(p.id, domainId)
    p.relatedBlogContent = null;
    if (blogContent?.entries?.length > 0) {
      p.relatedBlogArticle = {
        id: blogContent.entries[0].id,
        title: blogContent.entries[0].title,
        createDate: blogContent.entries[0].createDate,
        previewText: blogContent.entries[0].metaDescription,
        previewImage: blogContent.entries[0].previewImage,
        friendlyUrl: blogContent.entries[0].friendlyUrl,
      };
    }

    await redisDb.set(productCacheKey(productId, domainId), JSON.stringify(p), {
      EX: CACHE_TTL
    });

    p.origin = "db"

    logger.info(`find product: ${productId} ${p.name} origin: db duration: ${Date.now() - dbStart}ms`); // <-- log delta
    res.json(p);
  } catch (e) {
    logger.error("product not found: " + JSON.stringify(req.params));
    next(e)
  }
})

router.get("/:domainId/products/:productId/complements", async (req, res, next) => {

  try{
    const productId = parseInt(req.params.productId)
    const domainId = parseInt(req.params.domainId)
    const pids = await productComplements(productId)

    let products = await productService.findProducts(pids, domainId)

    var imgHelper = new ProductImageHelper()
    products = products.filter(p1 => p1.universalQuantity > 0)
    products.forEach(p => {
      p.url = getLink(p)

      if (p.image) {
        p.imageUrl = imgHelper.getUrl(p.image, 300, domainId)
      }

      return p
    })


    res.json({
      products
    })
  }catch(e){
    next(e)
  }
})

router.get("/:domainId/products/packs/:productId", async (req, res, next) => {

  try {
    const productId = parseInt(req.params.productId);
    const domainId = parseInt(req.params.domainId);


    const product = await productService.findProductWithInventory(productId, domainId)
    let packRules = await getProductSalesRules(product, domainId)


    if (!product.productItems.some(pit => pit.quantityInStock > 0)) {
      return res.json({packas: []})
    }

    packRules.sort(() => Math.random() - 0.5);

    if (packRules.length > 4) {
      packRules = packRules.slice(0, 4);
    }

    const packs = []
    for (var packRule of packRules) {
      var packProducts = [];

      for (var ruleDto of packRule.rules) {
        // do not use the rule which applies to the main product
        if (await isApplicableSalesRule(ruleDto, product, domainId))
          continue;

        var prods = await GetPackProducts(ruleDto, domainId);

        if (prods.length > 0) {
          prods.sort(() => Math.random() - 0.5);
          var packProduct = await productService.findProductWithInventory(prods[0].id, domainId);
          packProducts.push(packProduct);
        }
      }

      if (packProducts.length === 0) {
        continue;
      }

      const totalBasePrice = product.minPrice + packProducts.reduce((sum, p) => sum + p.minPrice, 0);
      const asRq = {saleTypeId: SaleType.Internet, items: []};

      asRq.items.push({
            uid: "" + product.id,
            quantity: 1,
            price: product.minPrice,
            productId: product.id,
            type: "PRODUCT",
            product: product
          }
      );


      for (const prod of packProducts) {
        asRq.items.push({
              uid: "" + prod.id,
              quantity: 1,
              price: prod.minPrice,
              productId: prod.id,
              type: "PRODUCT",
              product: prod
            }
        );
      }


      const pack = {
        id: packRule.id,
        name: packRule.name,
        title: packRule.name,
        total: totalBasePrice,
        savings: 0,
        mainProduct: product,
        products: packProducts,
      }

      const discounts = await cartService.getDiscounts(asRq, packRule, domainId);
      for (const dsct of discounts) {
        if (dsct.appliesTo != null) {
          for (const appliesTo of dsct.appliesTo) {
            if (appliesTo.productId === pack.mainProduct.id) {
              pack.mainProduct.discount = appliesTo.discount.amount * -1;
              pack.mainProduct.finalPrice =
                  pack.mainProduct.basePrice - pack.mainProduct.discount;
            } else {
              const packProd = pack.products.find(p => p.id === appliesTo.productId);
              packProd.discount = appliesTo.discount.amount * -1;
              packProd.finalPrice = packProd.basePrice - packProd.discount;
            }
          }
        }
      }

      pack.savings = -1 * (pack.mainProduct.discount ?? 0 + pack.products.reduce((sum, p) => sum + p.discount, 0));

      packs.push(pack)
    }

    const result = {
      isFromCache: false,
      discountRules: packRules.map(p => {
        return {id: p.id, name: p.name}
      }),
      packs: packs
    }

    res.json(result)

  } catch (e) {
    next(e)
  }

})

router.get("/:domainId/recommend", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.query.productId)
    const count = parseInt(req.query.count)

    var prodSm = await productService.findProduct(productId, domainId);

    var directCategory = null;

    let query = {

      bool: {
        must: [
          {
            query_string: {
              query: "isAvailableForInternet:true AND universalQuantity:>0 AND minPrice:>0"
            }
          }
        ],
        must_not: [
          { term: { "id": productId } }
        ],
        should: []
      }
    };
    if (prodSm.categories) {
      directCategory = prodSm.categories.find(c => c.isDirectCategory === true)
    }

    if (directCategory) {
      query.bool.should.push({
        terms: {
          "categories.id": [directCategory.id]
        }
      })
    }

    if (prodSm.tags && prodSm.tags.length > 0) {
      query.bool.should.push({
        terms: {
          "tags.id": prodSm.tags.map(t => t.id)
        }
      })

    }

    query.bool.should.push({
      range: {
        "minPrice": {
          gte: prodSm.minPrice * .75,
          lte: prodSm.minPrice * 1.25
        }
      }
    })


    const body = await getElClient().search({
      index: getIndexName(domainId),
      body: {
        query: query,
        from: 0,
        size: count ? count : 10,
        _source: {
          excludes: ['categories', 'properites', 'productItems',
            'propertiesMap', 'sword', 'properties', 'departments', 'features', 'tireSpecs']
        }

      }
    })

    var imgHelper = new ProductImageHelper()

    var products = body.hits.hits.map(h => {
      const p = h._source
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

    res.json(products)


  } catch (e) {
    next(e);
  }
})

router.post("/:domainId/products/notify-when-available", async (req, res, next) => {

  try{
    const domainId = parseInt(req.params.domainId);
    const rq = req.body;

    if(!rq.productItemId)
      return res.status(400).send({ message: "ProductItemId not received"})

    const p = await productService.findProductByProductItem(rq.productItemId, domainId)
    const pit = p.productItems.find(pi => pi.id === rq.productItemId)
    const desc = getProductItemDescription(p, pit)

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const templatePath = path.join( __dirname, "../..", 'templates', 'notify-when-available.ejs');
    // const templatePath = path.join(process.cwd(), '/templates/recover-account.ejs');
    const template = await fs.readFile(templatePath, 'utf-8');

    const html = ejs.render(template, {
      product: p,
      productItem: pit,
      productName: desc,
      size: p.features?.find(f => f.id === pit.sizeId)?.name || null,
      color: p.features?.find(f => f.id === pit.colorId)?.name || null,
      description: desc,
      storeUrl: "https://www.motomundi.cl",
      email: rq.email,
      unsubscribeUrl: "https://www.motomundi.cl",
    });


    const email = rq.email;
    await sgMail.send({
      to: email,
      bcc: ["jcfuentes@motomundi.cl", "patrick@motomundi.net"],
      from: 'ventas@motomundi.cl', // Change to your verified sender
      subject: `📋 Apuntado. Te avisamos cuando vuelva tu talla`,
      html: html,
    })

    const subject = `Notificar cuando esté disponible ${desc}`
    const data = await createKommoLead(email, subject)

    res.json({
      pit,
      desc,
      kommo: data || null,
    })

  }catch(e){
    next(e)
  }

})


async function GetPackProducts(prule, domainId) {

  const criteria = {
    categories: [],
    colors: [],
    products: [],
    brands: [],
    sizes: [],
    tags: [],
    limit: 10,
    offset: 0,
  }

  if (prule.brands != null)
    criteria.brands = prule.brands.map(b => b.id);
  if (prule.tags != null)
    criteria.tags = prule.tags.map(t => t.id);
  if (prule.products != null)
    criteria.products = prule.products.map(p => p.id);
  if (prule.categories != null)
    criteria.categories = prule.categories.map(c => c.id);


  const sRs = await search(criteria, domainId)

  return sRs.products
}

export default router