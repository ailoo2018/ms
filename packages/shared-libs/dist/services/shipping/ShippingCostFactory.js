"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingCostFactory = void 0;
const shipping_types_1 = require("../../models/shipping.types");
const AlasXpress_1 = require("./AlasXpress");
const StorePickup_1 = require("./StorePickup");
const STRATEGIES = {
    [shipping_types_1.ShippingMethod.AlasXpress]: AlasXpress_1.AlasXpress,
    [shipping_types_1.ShippingMethod.Store]: StorePickup_1.StorePickup,
};
class ShippingCostFactory {
    static create(methodId, domainId) {
        const StrategyClass = STRATEGIES[methodId];
        if (!StrategyClass) {
            throw new Error(`Unsupported shipping method: ${methodId}`);
        }
        return new StrategyClass();
    }
}
exports.ShippingCostFactory = ShippingCostFactory;
