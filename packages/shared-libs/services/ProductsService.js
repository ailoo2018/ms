const {getIndexName} = require("../el");
const {getPrice} = require("../products/price");
const {SaleType} = require("../models");

class ProductsService {

  constructor({elClient, discountRuleService, db}) {
    this.elClient = elClient;
    this.discountRuleService = discountRuleService;
    this.db = db
  }

  async productStock(ids, domainId) {

    const connection = await this.db.getConnection();

    try {
      const [rows] = await connection.query(
          `
            select pit.Id as productItemId,
                   sum(if(Quantity < 0, 0, Quantity)) as quantity
            from InventoryItem ii
                     join Facility f on f.Id = ii.FacilityId
                     join ProductItem pit on pit.Id = ii.ProductItemId
            where f.Type in (0, 2, 4, 7)
              and f.IsAvailableForInternet = 1
              and pit.Deleted = 0
              and pit.ProductId in (?)
              and f.DomainId = ?
            group by pit.Id;
`, [ids, domainId]);


      return rows;
    } catch (error) {
      console.log(error);
    } finally {
      await connection.release();
    }

  }


  async findProduct(productId, domainId) {
    const response = await this.elClient.get({
      index: getIndexName(domainId),
      id: productId,
      _source_excludes: ['sword', 'properties', 'departments', 'tags2', 'categoryPath']
    });


    return response._source;
  }

  async findProducts(productIds, domainId) {
    const response = await this.elClient.search({
      index: getIndexName(domainId),
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  domainId: domainId,
                }
              },
              {
                terms: {
                  id: productIds,
                }
              }
            ]
          }
        }
      },
      _source: {
        excludes: ['sword', 'properties', 'departments', 'tags2', 'categoryPath']
      }
    });


    return response.hits.hits.map(h => h._source);
  }

  async findProductsByProductItems(pitIds, domainId) {
    const response = await this.elClient.search({
      index: getIndexName(domainId),
      body: {
        "query": {
          "bool": {
            "filter": [
              {
                "term": {
                  "domainId": domainId
                }
              },
              {
                "nested": {
                  "path": "productItems",
                  "query": {
                    "terms": {
                      "productItems.id": pitIds
                    }
                  }
                }
              }
            ]
          }
        }
      }
    });

    if (response.hits.hits.length === 0) {
      return [];
    }

    return response.hits.hits.map(h => {
      return h._source
    });

  }

  async findAssociations(productId, domainId) {
    const connection = await this.db.getConnection();

    try {
      const [rows] = await connection.execute(
          `select *
from productassociation
where PartOfId = ? and AssociationType = 0 ;`, [productId]);


      return rows;
    } catch (error) {
      console.log(error);
    } finally {
      await connection.release();
    }
  }

  async findProductByProductItem(pitId, domainId) {
    const products = await this.findProductsByProductItems([pitId], domainId)
    if (products.length > 0) {
      return products[0];
    }

    return null
  }

  getProductItemDescription(product, pit) {
    let desc = product.name;

    if (product.fullName)
      desc = product.fullName;

    if (pit.colorId > 0) {
      const color = product.features.find(f => f.id === pit.colorId)
      desc += " " + color.name
    }

    if (pit.sizeId > 0) {
      const size = product.features.find(f => f.id === pit.sizeId)
      desc += " " + size.name
    }

    return desc;

  }

  getColor(product, pit) {
    if (pit.colorId === 0)
      return null

    return product.features.find(f => f.id === pit.colorId)
  }

  getSize(product, pit) {
    if (pit.sizeId === 0)
      return null

    return product.features.find(f => f.id === pit.sizeId)

  }

  async getPrice(product, pit, saleTypeId, currency = "CLP") {
    return await getPrice(product, pit, saleTypeId, currency, 0, 1, this.discountRuleService);
  }

  async findProductWithInventory(productId, domainId) {
    const p = await this.findProduct(productId, domainId)

    const stock = await this.productStock([productId], domainId);

    for(var pit of p.productItems){
      const priceComponent = await getPrice(p, pit, SaleType.Internet, "CLP", 0, 1, this.discountRuleService);
      const { price, discount } = priceComponent.getPrice()

      pit.price = {
        currency: price.currency,
        price: price.amount,
        oldPrice: discount ? price.amount - discount.amount : price.amount,
        discount: discount ? discount.amount : 0,
      }
    }

    for (var s of stock) {
      var prodItem = p.productItems.find(pit => pit.id === s.productItemId)

      if (prodItem) {
        prodItem.quantityInStock = parseInt(s.quantity)
      }
    }

    return p
  }

  async findProductsWithInventory(prodsIds, domainId) {
    const products = await this.findProducts(prodsIds, domainId)

    const stock = await this.productStock(prodsIds, domainId);

    for(var p of products) {
      for (var s of stock) {
        var prodItem = p.productItems.find(pit => pit.id === s.productItemId)

        if (prodItem) {
          prodItem.quantityInStock = parseInt(s.quantity)
        }
      }
    }

    return products
  }

}

module.exports = ProductsService;