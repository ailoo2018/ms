const {app} = require("../server");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")
const logger = require("@ailoo/shared-libs/logger")
const {findProduct} = require("../el/products");
const {productStock} = require("../db/inventory");
const {productDescription} = require("../db/product");

app.get("/:domainId/products/:productId",   async (req, res, next) => {

  try{

    const domainId = parseInt(req.params.domainId);
    const productId = parseInt(req.params.productId)
    const p = await findProduct(productId, domainId)

    const imgHelper = new ProductImageHelper();
    if(p.image){
      p.imageUrl = imgHelper.getUrl(p.image)
    }

    const stock = await productStock(productId, domainId);

    for(var s of stock){
      var prodItem = p.productItems.find(pit => pit.id === s.productItemId )

      if(prodItem) {
        prodItem.quantityInStock = parseInt( s.quantity )
      }
    }

    // recover description
    p.description =  await productDescription(productId);



    res.json(p);
  }catch(e){
    next(e)
  }
})

app.get("/:domainId/products/packs/:productId", async (req, res, next) => {
  res.json({
    "isFromCache": true,
    "discountRules": [
      {
        "id": 1867,
        "createDate": "1901-01-01T04:42:45Z",
        "createUser": {
          "id": 16238,
          "username": null
        },
        "name": "Pack casco más foam fresh",
        "validFrom": "2025-03-01T06:00:00Z",
        "validThru": null,
        "rules": [
          {
            "minPrice": 0.0,
            "products": null,
            "brands": null,
            "models": null,
            "tags": null,
            "categories": [
              {
                "id": 41,
                "name": "Cascos Integrales",
                "description": "Cascos Integrales"
              },
              {
                "id": 42,
                "name": "Cascos Abatibles",
                "description": "Cascos Abatibles"
              },
              {
                "id": 85,
                "name": "Cascos Doble Proposito",
                "description": "Cascos Doble Proposito"
              },
              {
                "id": 43,
                "name": "Cascos Abiertos",
                "description": "Cascos Abiertos"
              },
              {
                "id": 45,
                "name": "Cascos MX/Enduro",
                "description": "Cascos MX/Enduro"
              }
            ],
            "quantity": 1
          },
          {
            "minPrice": 0.0,
            "products": [
              {
                "id": 2916,
                "name": "Espuma Limpiadora - Foam Fresh",
                "description": null
              }
            ],
            "brands": null,
            "models": null,
            "tags": null,
            "categories": null,
            "quantity": 1
          }
        ],
        "appliesTo": 1,
        "discount": {
          "amount": 10.0,
          "type": "%"
        },
        "code": null,
        "saleTypes": [],
        "tags": [],
        "domainId": 1,
        "score": 0.0
      },
      {
        "id": 1996,
        "createDate": "1901-01-01T04:42:45Z",
        "createUser": {
          "id": 16238,
          "username": null
        },
        "name": "Pack Luz Casco",
        "validFrom": "2025-09-07T04:00:00Z",
        "validThru": null,
        "rules": [
          {
            "minPrice": 0.0,
            "products": null,
            "brands": null,
            "models": null,
            "tags": null,
            "categories": [
              {
                "id": 41,
                "name": "Cascos Integrales",
                "description": "Cascos Integrales"
              },
              {
                "id": 42,
                "name": "Cascos Abatibles",
                "description": "Cascos Abatibles"
              },
              {
                "id": 43,
                "name": "Cascos Abiertos",
                "description": "Cascos Abiertos"
              },
              {
                "id": 85,
                "name": "Cascos Doble Proposito",
                "description": "Cascos Doble Proposito"
              }
            ],
            "quantity": 1
          },
          {
            "minPrice": 0.0,
            "products": [
              {
                "id": 3309601,
                "name": "Luz para Casco",
                "description": null
              }
            ],
            "brands": null,
            "models": null,
            "tags": null,
            "categories": null,
            "quantity": 1
          }
        ],
        "appliesTo": 1,
        "discount": {
          "amount": 10.0,
          "type": "%"
        },
        "code": null,
        "saleTypes": [],
        "tags": [],
        "domainId": 1,
        "score": 0.0
      },
      {
        "id": 1870,
        "createDate": "1901-01-01T04:42:45Z",
        "createUser": {
          "id": 16238,
          "username": null
        },
        "name": "Pack casco más limpia visor",
        "validFrom": "2025-03-01T06:00:00Z",
        "validThru": null,
        "rules": [
          {
            "minPrice": 0.0,
            "products": null,
            "brands": null,
            "models": null,
            "tags": null,
            "categories": [
              {
                "id": 41,
                "name": "Cascos Integrales",
                "description": "Cascos Integrales"
              },
              {
                "id": 42,
                "name": "Cascos Abatibles",
                "description": "Cascos Abatibles"
              },
              {
                "id": 85,
                "name": "Cascos Doble Proposito",
                "description": "Cascos Doble Proposito"
              },
              {
                "id": 43,
                "name": "Cascos Abiertos",
                "description": "Cascos Abiertos"
              }
            ],
            "quantity": 1
          },
          {
            "minPrice": 0.0,
            "products": [
              {
                "id": 1627,
                "name": "Limpiador de Casco y Visera",
                "description": null
              }
            ],
            "brands": null,
            "models": null,
            "tags": null,
            "categories": null,
            "quantity": 1
          }
        ],
        "appliesTo": 1,
        "discount": {
          "amount": 10.0,
          "type": "%"
        },
        "code": null,
        "saleTypes": [],
        "tags": [],
        "domainId": 1,
        "score": 0.0
      },
      {
        "id": 2016,
        "createDate": "1901-01-01T04:42:45Z",
        "createUser": {
          "id": 249198,
          "username": null
        },
        "name": "Pack AGV K1S + visor Ahumado",
        "validFrom": "2025-09-11T06:00:00Z",
        "validThru": null,
        "rules": [
          {
            "minPrice": 0.0,
            "products": [
              {
                "id": 3214007,
                "name": "Visor GT4 MPLK para K1 S/ K5 S Ahumado",
                "description": null
              }
            ],
            "brands": null,
            "models": null,
            "tags": null,
            "categories": null,
            "quantity": 1
          },
          {
            "minPrice": 0.0,
            "products": [
              {
                "id": 2881397,
                "name": "K1 S Sling",
                "description": null
              },
              {
                "id": 2993400,
                "name": "K1 S (2023) Fastlap",
                "description": null
              },
              {
                "id": 2356893,
                "name": "K1 S (2023) VR46 Sky Racing Team",
                "description": null
              },
              {
                "id": 2993399,
                "name": "K1 S (2023) Lyzard",
                "description": null
              },
              {
                "id": 2356897,
                "name": "K1 S (2023)",
                "description": null
              },
              {
                "id": 2356881,
                "name": "K1 S (2023) VR Soleluna 2015",
                "description": null
              },
              {
                "id": 2356854,
                "name": "K1 S (2023) VR Soleluna 2018",
                "description": null
              },
              {
                "id": 2356874,
                "name": "K1 S (2023) VR Soleluna 2017",
                "description": null
              },
              {
                "id": 2356876,
                "name": "K1 S (2023) VR Limit 46",
                "description": null
              },
              {
                "id": 2356878,
                "name": "K1 S (2023) VR Track 46",
                "description": null
              },
              {
                "id": 2356887,
                "name": "K1 S (2023) VR Grazie Vale",
                "description": null
              },
              {
                "id": 2881395,
                "name": "K1 S Mugello 1999",
                "description": null
              },
              {
                "id": 2356882,
                "name": "K1 S (2023) VR Dreamtime",
                "description": null
              },
              {
                "id": 2993979,
                "name": "K1 S Pulse 46",
                "description": null
              },
              {
                "id": 2356890,
                "name": "K1 S (2023) Salom",
                "description": null
              },
              {
                "id": 2356895,
                "name": "K1 S (2023) Izan",
                "description": null
              },
              {
                "id": 2356896,
                "name": "K1 S (2023) Warmup",
                "description": null
              },
              {
                "id": 2993980,
                "name": "K1 S Bezzecchi",
                "description": null
              },
              {
                "id": 2993982,
                "name": "K1 S Lap",
                "description": null
              }
            ],
            "brands": null,
            "models": null,
            "tags": null,
            "categories": null,
            "quantity": 1
          }
        ],
        "appliesTo": 1,
        "discount": {
          "amount": 10.0,
          "type": "%"
        },
        "code": null,
        "saleTypes": [
          {
            "id": 1,
            "name": "Tienda",
            "description": null
          },
          {
            "id": 3,
            "name": "Internet",
            "description": null
          }
        ],
        "tags": [],
        "domainId": 1,
        "score": 0.0
      }
    ],
    "packs": [
      {
        "total": 263310.0,
        "savings": -1490.0,
        "title": "Pack Luz Casco",
        "id": 1996,
        "mainProduct": {
          "images": [
            {
              "url": "/Content/products/1/4/7e/47e853efb87641dfa3035d4569e952e4_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 0
            },
            {
              "url": "/Content/products/1/d/36/d366dcb03cf5404baabd8e42229bf4f2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 1
            },
            {
              "url": "/Content/products/1/0/cc/0cc17c833fa343b3ad1c277b2a4b4be2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 2
            },
            {
              "url": "/Content/products/1/2/ae/2ae6631355304968bbbe78f827c405cc_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 3
            },
            {
              "url": "/Content/products/1/0/20/02004800926b42cf964f2f0c154a081a_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 4
            }
          ],
          "id": 2356895,
          "productName": "K1 S (2023) Izan",
          "brandName": "AGV",
          "image": "47e853efb87641dfa3035d4569e952e4.png",
          "discount": 0.0,
          "hasDiscount": false,
          "basePrice": 249900.0,
          "finalPrice": 249900.0,
          "productFeatures": [
            {
              "color": null,
              "size": {
                "id": 1,
                "name": "S"
              }
            },
            {
              "color": null,
              "size": {
                "id": 2,
                "name": "M"
              }
            },
            {
              "color": null,
              "size": {
                "id": 4,
                "name": "XL"
              }
            }
          ],
          "url": "/motocicleta/2356895-cascos-integrales-agv-k1-s-2023-izan",
          "stock": [
            {
              "productItemId": 2726665,
              "colorId": 0,
              "sizeId": 2,
              "quantity": 2
            },
            {
              "productItemId": 2726666,
              "colorId": 0,
              "sizeId": 3,
              "quantity": 0
            },
            {
              "productItemId": 2726667,
              "colorId": 0,
              "sizeId": 4,
              "quantity": 10
            },
            {
              "productItemId": 2726664,
              "colorId": 0,
              "sizeId": 1,
              "quantity": 2
            }
          ],
          "sizes": [
            {
              "id": 1,
              "name": "S"
            },
            {
              "id": 2,
              "name": "M"
            },
            {
              "id": 3,
              "name": "L"
            },
            {
              "id": 4,
              "name": "XL"
            }
          ],
          "colors": []
        },
        "name": "Pack Luz Casco",
        "products": [
          {
            "images": [
              {
                "url": "/Content/products/1/a/dc/adc69de75e1f45f2a4da0d8a4943d38a_600.jpg",
                "image" : "adc69de75e1f45f2a4da0d8a4943d38a.jpg",
                "colorId": 156509,
                "colorName": "Negro/ Rojo",
                "order": 0
              },
              {
                "url": "/Content/products/1/e/a2/ea2b5d7523b94e909ff66fd91a98388b_600.png",
                "image" : "ea2b5d7523b94e909ff66fd91a98388b.png",
                "colorId": 156509,
                "colorName": "Negro/ Rojo",
                "order": 1
              }
            ],
            "id": 3309601,
            "productName": "Luz para Casco",
            "brandName": "Taurus",
            "image": "adc69de75e1f45f2a4da0d8a4943d38a.jpg",
            "discount": 1490.0,
            "hasDiscount": false,
            "basePrice": 14900.0,
            "finalPrice": 13410.0,
            "productFeatures": [
              {
                "color": {
                  "id": 156509,
                  "name": "Negro/ Rojo"
                },
                "size": {
                  "id": 191730,
                  "name": "Tamaño Unico"
                }
              }
            ],
            "url": "/motocicleta/3309601-accesorios-cascos-taurus-luz-para-casco",
            "stock": [
              {
                "productItemId": 3827363,
                "colorId": 156509,
                "sizeId": 191730,
                "quantity": 4
              }
            ],
            "sizes": [
              {
                "id": 191730,
                "name": "Tamaño Unico"
              }
            ],
            "colors": [
              {
                "id": 156509,
                "name": "Negro/ Rojo"
              }
            ]
          }
        ]
      },
      {
        "total": 255210.0,
        "savings": -590.0,
        "title": "Pack casco más limpia visor",
        "id": 1870,
        "mainProduct": {
          "images": [
            {
              "url": "/Content/products/1/4/7e/47e853efb87641dfa3035d4569e952e4_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 0
            },
            {
              "url": "/Content/products/1/d/36/d366dcb03cf5404baabd8e42229bf4f2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 1
            },
            {
              "url": "/Content/products/1/0/cc/0cc17c833fa343b3ad1c277b2a4b4be2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 2
            },
            {
              "url": "/Content/products/1/2/ae/2ae6631355304968bbbe78f827c405cc_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 3
            },
            {
              "url": "/Content/products/1/0/20/02004800926b42cf964f2f0c154a081a_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 4
            }
          ],
          "id": 2356895,
          "productName": "K1 S (2023) Izan",
          "brandName": "AGV",
          "image": "47e853efb87641dfa3035d4569e952e4.png",
          "discount": 0.0,
          "hasDiscount": false,
          "basePrice": 249900.0,
          "finalPrice": 249900.0,
          "productFeatures": [
            {
              "color": null,
              "size": {
                "id": 1,
                "name": "S"
              }
            },
            {
              "color": null,
              "size": {
                "id": 2,
                "name": "M"
              }
            },
            {
              "color": null,
              "size": {
                "id": 4,
                "name": "XL"
              }
            }
          ],
          "url": "/motocicleta/2356895-cascos-integrales-agv-k1-s-2023-izan",
          "stock": [
            {
              "productItemId": 2726665,
              "colorId": 0,
              "sizeId": 2,
              "quantity": 2
            },
            {
              "productItemId": 2726666,
              "colorId": 0,
              "sizeId": 3,
              "quantity": 0
            },
            {
              "productItemId": 2726667,
              "colorId": 0,
              "sizeId": 4,
              "quantity": 10
            },
            {
              "productItemId": 2726664,
              "colorId": 0,
              "sizeId": 1,
              "quantity": 2
            }
          ],
          "sizes": [
            {
              "id": 1,
              "name": "S"
            },
            {
              "id": 2,
              "name": "M"
            },
            {
              "id": 3,
              "name": "L"
            },
            {
              "id": 4,
              "name": "XL"
            }
          ],
          "colors": []
        },
        "name": "Pack casco más limpia visor",
        "products": [
          {
            "images": [
              {
                "url": "/Content/products/1/a/b0/ab065cedbaa74b04b0a4a979db79f5ac_600.png",
                "colorId": 0,
                "colorName": null,
                "order": 0
              },
              {
                "url": "/Content/products/1/8/0e/80eeee2f2ba64da8b113fb0a2f2cd51a_600.png",
                "colorId": 0,
                "colorName": null,
                "order": 1
              },
              {
                "url": "/Content/products/1/4/38/4386b2849bd24c2badd7fc9010a1f263_600.png",
                "colorId": 0,
                "colorName": null,
                "order": 2
              },
              {
                "url": "/Content/products/1/a/20/a208e16f7c8c47089bc68b870c32201f_600.png",
                "colorId": 0,
                "colorName": null,
                "order": 3
              },
              {
                "url": "/Content/products/1/8/57/857d4d86c0454ee08d89746c00635656_600.jpg",
                "colorId": 0,
                "colorName": null,
                "order": 4
              }
            ],
            "id": 1627,
            "productName": "Limpiador de Casco y Visera",
            "brandName": "Muc-Off",
            "image": "ab065cedbaa74b04b0a4a979db79f5ac.png",
            "discount": 590.0,
            "hasDiscount": false,
            "basePrice": 5900.0,
            "finalPrice": 5310.0,
            "productFeatures": [
              {
                "color": null,
                "size": {
                  "id": 79076,
                  "name": "32ml"
                }
              }
            ],
            "url": "/motocicleta/accesorios-cascos-muc-off-limpiador-de-casco-y-visera",
            "stock": [
              {
                "productItemId": 580,
                "colorId": 0,
                "sizeId": 630,
                "quantity": 0
              },
              {
                "productItemId": 1564475,
                "colorId": 0,
                "sizeId": 79074,
                "quantity": -1
              },
              {
                "productItemId": 2246871,
                "colorId": 0,
                "sizeId": 79076,
                "quantity": 0
              }
            ],
            "sizes": [
              {
                "id": 630,
                "name": "35ml"
              },
              {
                "id": 79074,
                "name": "250ml"
              },
              {
                "id": 79076,
                "name": "32ml"
              }
            ],
            "colors": []
          }
        ]
      },
      {
        "total": 312810.0,
        "savings": -6990.0,
        "title": "Pack AGV K1S + visor Ahumado",
        "id": 2016,
        "mainProduct": {
          "images": [
            {
              "url": "/Content/products/1/4/7e/47e853efb87641dfa3035d4569e952e4_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 0
            },
            {
              "url": "/Content/products/1/d/36/d366dcb03cf5404baabd8e42229bf4f2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 1
            },
            {
              "url": "/Content/products/1/0/cc/0cc17c833fa343b3ad1c277b2a4b4be2_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 2
            },
            {
              "url": "/Content/products/1/2/ae/2ae6631355304968bbbe78f827c405cc_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 3
            },
            {
              "url": "/Content/products/1/0/20/02004800926b42cf964f2f0c154a081a_600.png",
              "colorId": 0,
              "colorName": null,
              "order": 4
            }
          ],
          "id": 2356895,
          "productName": "K1 S (2023) Izan",
          "brandName": "AGV",
          "image": "47e853efb87641dfa3035d4569e952e4.png",
          "discount": 0.0,
          "hasDiscount": false,
          "basePrice": 249900.0,
          "finalPrice": 249900.0,
          "productFeatures": [
            {
              "color": null,
              "size": {
                "id": 1,
                "name": "S"
              }
            },
            {
              "color": null,
              "size": {
                "id": 2,
                "name": "M"
              }
            },
            {
              "color": null,
              "size": {
                "id": 4,
                "name": "XL"
              }
            }
          ],
          "url": "/motocicleta/2356895-cascos-integrales-agv-k1-s-2023-izan",
          "stock": [
            {
              "productItemId": 2726665,
              "colorId": 0,
              "sizeId": 2,
              "quantity": 2
            },
            {
              "productItemId": 2726666,
              "colorId": 0,
              "sizeId": 3,
              "quantity": 0
            },
            {
              "productItemId": 2726667,
              "colorId": 0,
              "sizeId": 4,
              "quantity": 10
            },
            {
              "productItemId": 2726664,
              "colorId": 0,
              "sizeId": 1,
              "quantity": 2
            }
          ],
          "sizes": [
            {
              "id": 1,
              "name": "S"
            },
            {
              "id": 2,
              "name": "M"
            },
            {
              "id": 3,
              "name": "L"
            },
            {
              "id": 4,
              "name": "XL"
            }
          ],
          "colors": []
        },
        "name": "Pack AGV K1S + visor Ahumado",
        "products": [
          {
            "images": [
              {
                "url": "/Content/products/1/2/bb/2bbc1914ff9b4f19a96e3b207f118f49_600.jpeg",
                "colorId": 10288,
                "colorName": "Ahumado",
                "order": 0
              }
            ],
            "id": 3214007,
            "productName": "Visor GT4 MPLK para K1 S/ K5 S Ahumado",
            "brandName": "AGV",
            "image": "2bbc1914ff9b4f19a96e3b207f118f49.jpeg",
            "discount": 6990.0,
            "hasDiscount": false,
            "basePrice": 69900.0,
            "finalPrice": 62910.0,
            "productFeatures": [
              {
                "color": {
                  "id": 10288,
                  "name": "Ahumado"
                },
                "size": {
                  "id": 296895,
                  "name": "L-XL-2XL"
                }
              }
            ],
            "url": "/motocicleta/3214007-visores-para-cascos-agv-visor-gt4-mplk-para-k1-s-k5-s-ahumado",
            "stock": [
              {
                "productItemId": 3721285,
                "colorId": 10288,
                "sizeId": 296894,
                "quantity": 0
              },
              {
                "productItemId": 3721286,
                "colorId": 10288,
                "sizeId": 296895,
                "quantity": 12
              }
            ],
            "sizes": [
              {
                "id": 296894,
                "name": "XS-S-M"
              },
              {
                "id": 296895,
                "name": "L-XL-2XL"
              }
            ],
            "colors": [
              {
                "id": 10288,
                "name": "Ahumado"
              }
            ]
          }
        ]
      }
    ]
  })
})