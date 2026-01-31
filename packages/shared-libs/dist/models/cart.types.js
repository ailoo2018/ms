"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeType = exports.ProductType = void 0;
// Enums for type safety
var ProductType;
(function (ProductType) {
    ProductType[ProductType["Simple"] = 0] = "Simple";
    ProductType[ProductType["Pack"] = 1] = "Pack";
})(ProductType || (exports.ProductType = ProductType = {}));
var AttributeType;
(function (AttributeType) {
    AttributeType[AttributeType["Size"] = 0] = "Size";
    AttributeType[AttributeType["Color"] = 1] = "Color";
})(AttributeType || (exports.AttributeType = AttributeType = {}));
