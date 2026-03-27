import {getIndexName} from "../el/index.js";
import {getPrice} from "../products/price.js";
import {SaleType} from "../models/index.js";


export default class ProductsService {
    private elClient: any;
    private discountRuleService: any;
    private db: any;

    constructor({elClient, discountRuleService, db}: { elClient: any, discountRuleService: any, db: any }) {
        this.elClient = elClient;
        this.discountRuleService = discountRuleService;
        this.db = db
    }

    async productStock(ids: any, domainId: any) {

        const connection = await this.db.getConnection();

        try {
            const [rows] = await connection.query(
                `
            select pit.Id as productItemId,
                   sum(if(Quantity < 0, 0, Quantity)) as quantity
            from InventoryItem ii
                     join Facility f on f.Id = ii.FacilityId
                     join ProductItem pit on pit.Id = ii.ProductItemId
            where f.Type in (0, 1,  2, 4, 7) 
              and f.IsAvailableForInternet = 1
              and pit.Deleted = 0
              and pit.ProductId in (?)
              and f.Deleted = 0
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

    async findProduct(productId: any, domainId: any) {
        if (!productId) return null;

        try {
            const response = await this.elClient.get({
                index: getIndexName(domainId),
                id: productId,
                _source_excludes: ['sword', 'properties', 'departments', 'tags2', 'categoryPath', 'productItems.sword', 'productItems.description']
            });
            return response._source;
        } catch (err: any) {
            if (err.meta?.statusCode === 404) {
                return null;
            }
            throw err; // re-throw unexpected errors
        }
    }

    async findProducts(productIds: any, domainId: any) {

        if (!productIds || productIds.length === 0)
            return []

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
                excludes: ['sword', 'properties', 'departments', 'tags2', 'categoryPath', 'categories', 'productItems.sword', 'productItems.description']
            }
        });


        return response.hits.hits.map((h: any) => h._source);
    }

    async findProductsByProductItems(pitIds: any, domainId: any) {
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

        return response.hits.hits.map((h: any) => {
            return h._source
        });

    }

    async findAssociations(productId: any, domainId: any) {
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

    async findProductByProductItem(pitId: any, domainId: any) {
        const products = await this.findProductsByProductItems([pitId], domainId)
        if (products.length > 0) {
            return products[0];
        }

        return null
    }

    getProductItemDescription(product: any, pit: any) {
        let desc = product.name;

        if (product.fullName)
            desc = product.fullName;

        if (pit.colorId > 0) {
            const color = product.features.find((f: any) => f.id === pit.colorId)
            desc += " " + color.name
        }

        if (pit.sizeId > 0) {
            const size = product.features.find((f: any) => f.id === pit.sizeId)
            desc += " " + size.name
        }

        return desc;

    }

    getColor(product: any, pit: any) {
        if (pit.colorId === 0)
            return null

        return product.features.find((f: any) => f.id === pit.colorId)
    }

    getSize(product: any, pit: any) {
        if (pit.sizeId === 0)
            return null

        return product.features.find((f: any) => f.id === pit.sizeId)

    }

    async getPrice(product: any, pit: any, saleTypeId: any, currency = "CLP") {
        return await getPrice(product, pit, saleTypeId, currency, 0, 1, this.discountRuleService);
    }

    async price(product: any, pit: any, saleTypeId: any, currency = "CLP") {
        const priceComp = await getPrice(product, pit, saleTypeId, currency, 0, 1, this.discountRuleService);

        if (priceComp) {
            let price = priceComp.getPrice()
            return {
                price: price.price.amount,
                oldPrice: price.discount ? price.price.amount - price.discount.amount : price.price.amount,
                discount: price.discount ? price.discount.amount : 0,
            }

        }

        return {
            price: 0,
            oldPrice: 0,
            discount: 0,
        }
    }

    async findProductWithInventory(productId: any, domainId: any, currency = "CLP") {

        if (!productId)
            return null

        const p = await this.findProduct(productId, domainId)
        if (!p)
            return null

        const stock = await this.productStock([productId], domainId);

        for (var pit of p.productItems) {
            const priceComponent = await getPrice(p, pit, SaleType.Internet, currency, 0, 1, this.discountRuleService);
            if (!priceComponent)
                throw new Error("No pricecomponent")
            const {price, discount} = priceComponent.getPrice()

            pit.price = {
                currency: price.currency,
                price: price.amount,
                oldPrice: discount ? price.amount + discount.amount : price.amount,
                discount: discount ? discount.amount : 0,
            }
        }

        for (var s of stock) {
            var prodItem = p.productItems.find((pit: any) => pit.id === s.productItemId)

            if (prodItem) {
                prodItem.quantityInStock = parseInt(s.quantity)
            }
        }

        return p
    }

    async findProductsWithInventory(prodsIds: any, domainId: any) {
        const products = await this.findProducts(prodsIds, domainId)

        const stock = await this.productStock(prodsIds, domainId);

        for (var p of products) {
            for (var s of stock) {
                var prodItem = p.productItems.find((pit: any) => pit.id === s.productItemId)

                if (prodItem) {
                    prodItem.quantityInStock = parseInt(s.quantity)
                }
            }
        }

        return products
    }

    async getProductsMap(prodsIds: number[], domainId: number) {
        if (!prodsIds || prodsIds.length === 0)
            return {};

        const body = await this.elClient.search({
            index: getIndexName(domainId),
            body: {
                size: 3000,
                query: {
                    "terms": {
                        "id": prodsIds
                    }
                },
                _source: ["id", "name", "brand", "image", "fullName", "productItems", "features"]
            }
        });

        var prodsSM = body.hits.hits.map((h:any) => h._source);
        var map: any = {}


        for (var p of prodsSM) {

            for (var pi of p.productItems) {
                if (pi.colorId > 0) {
                    pi.color = p.features.find((f: any) => f.id === pi.colorId)
                }
                if (pi.sizeId > 0) {
                    pi.size = p.features.find((f: any) => f.id === pi.sizeId)
                }


                map[pi.id] = {
                    id: pi.id,
                    product: {
                        id: p.id,
                        fullName: p.fullName,
                        image: p.image,
                        brand: p.brand && {
                            id: p.brand.id,
                            name: p.brand.name,
                            logo: p.brand.logo
                        }
                    },
                    image: p.image,
                    size: pi.size,
                    color: pi.color
                };

            }

        }

        return map;
    }

}

