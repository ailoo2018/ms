"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentCategoryType = exports.ShippingMethod = void 0;
var ShippingMethod;
(function (ShippingMethod) {
    ShippingMethod[ShippingMethod["CorreosDeChile"] = 1] = "CorreosDeChile";
    ShippingMethod[ShippingMethod["Starken"] = 2] = "Starken";
    ShippingMethod[ShippingMethod["Turbus"] = 2] = "Turbus";
    ShippingMethod[ShippingMethod["TurbusPorPagar"] = 3] = "TurbusPorPagar";
    ShippingMethod[ShippingMethod["Chilexpress"] = 5] = "Chilexpress";
    ShippingMethod[ShippingMethod["UPS"] = 6] = "UPS";
    ShippingMethod[ShippingMethod["Bluexpress"] = 7] = "Bluexpress";
    ShippingMethod[ShippingMethod["FreeShipping"] = 8] = "FreeShipping";
    ShippingMethod[ShippingMethod["Store"] = 9] = "Store";
    ShippingMethod[ShippingMethod["Tnt"] = 10] = "Tnt";
    ShippingMethod[ShippingMethod["AlasXpress"] = 13] = "AlasXpress";
    ShippingMethod[ShippingMethod["Custom"] = 14] = "Custom";
})(ShippingMethod || (exports.ShippingMethod = ShippingMethod = {}));
var ShipmentCategoryType;
(function (ShipmentCategoryType) {
    ShipmentCategoryType[ShipmentCategoryType["Unknown"] = 0] = "Unknown";
    ShipmentCategoryType[ShipmentCategoryType["ClickAndCollect"] = 1] = "ClickAndCollect";
    ShipmentCategoryType[ShipmentCategoryType["HomeDelivery"] = 2] = "HomeDelivery";
    ShipmentCategoryType[ShipmentCategoryType["ExpressDelivery"] = 3] = "ExpressDelivery";
    ShipmentCategoryType[ShipmentCategoryType["PickupPoint"] = 4] = "PickupPoint";
})(ShipmentCategoryType || (exports.ShipmentCategoryType = ShipmentCategoryType = {}));
