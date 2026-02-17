import '@ailoo/shared-libs/config';
import {WebPayValidator} from "../clients/webPayClient.js";
import {asClass, asValue, createContainer} from "awilix";
import {MercadoPagoValidator} from "../clients/mercadoPagoClient.js";
import ProductsService from "@ailoo/shared-libs/ProductsService";
import {DiscountRuleService} from "@ailoo/shared-libs/DiscountRuleService";
import {ProductCategoryService} from "@ailoo/shared-libs/ProductCategoryService";
import {CartService} from "@ailoo/shared-libs/CartService";
import {CartRepos} from "@ailoo/shared-libs/CartRepos";
import {ShippingService } from "@ailoo/shared-libs/ShippingService";
import {ProductCategoryDb} from "@ailoo/shared-libs/ProductCategoryDb";
import {SizeChartService} from "@ailoo/shared-libs/SizeChartService";
import {MotorcyclesService} from "../services/MotorcyclesService.js";



import {pool} from "../connections/mysql.js";

import {getElClient} from "../connections/el.js";

import {db as redisDb} from "../connections/rdb.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {DlocalValidator} from "../clients/dlocalValidator.js";

const container = createContainer();

container.register({
  webPayValidator: asClass(WebPayValidator).singleton(),
  sizeChartService: asClass(SizeChartService).singleton(),
  dlocalValidator: asClass(DlocalValidator).singleton(),
  mercadoPagoValidator: asClass(MercadoPagoValidator).singleton(),
  productsService: asClass(ProductsService).singleton(),
  productCategoryService: asClass(ProductCategoryService).singleton(),
  discountRuleService: asClass(DiscountRuleService).singleton(),
  cartService: asClass(CartService).singleton(),
  cartRepository: asClass(CartRepos).singleton(),
  productCategoryDb: asClass(ProductCategoryDb).singleton(),
  shippingService: asClass(ShippingService).singleton(),
  motorcyclesService: asClass(MotorcyclesService).singleton(),
  elClient: asValue(getElClient()),
  redisClient: asValue(redisDb),
  db: asValue(pool),
  drizzleDb: asValue(drizzleDb),
});


export default container;