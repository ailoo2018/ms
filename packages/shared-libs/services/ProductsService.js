const {getIndexName} = require("../el");
const {getPrice} = require("../products/price");

class ProductsService {

  constructor({ elClient, discountRuleService, db }) {
    this.elClient = elClient;
    this.discountRuleService = discountRuleService;
    this.db = db
  }

  async productStock(id, domainId) {

    const connection = await this.db.getConnection();

    try {
      const [rows ] = await connection.execute(
          `
            select pit.Id as productItemId,
                   sum(if(Quantity < 0, 0, Quantity)) as quantity
            from InventoryItem ii
                     join Facility f on f.Id = ii.FacilityId
                     join ProductItem pit on pit.Id = ii.ProductItemId
            where f.Type in (0, 2, 4, 7)
              and f.IsAvailableForInternet = 1
              and pit.Deleted = 0
              and pit.ProductId = ?
              and f.DomainId = ?
            group by pit.Id;
`, [ id, domainId ]);



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
      id: productId
    });


    return response._source;
  }

  async getPrice(product, pit, saleTypeId, currency){
    return await getPrice(product, pit, saleTypeId, currency, 0, 1, this.discountRuleService);
  }

  async findProductWithInventory(productId, domainId){
    const p = await this.findProduct(productId, domainId)

    const stock = await this.productStock(productId, domainId);

    for(var s of stock){
      var prodItem = p.productItems.find(pit => pit.id === s.productItemId )

      if(prodItem) {
        prodItem.quantityInStock = parseInt( s.quantity )
      }
    }

    return p
  }


}

module.exports = ProductsService;