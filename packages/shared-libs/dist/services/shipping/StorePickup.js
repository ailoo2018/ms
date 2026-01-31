"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorePickup = void 0;
class StorePickup {
    calculate(vw, comunaId, domainId) {
        let total = { amount: 0, unit: "CLP" };
        let quote = {
            cost: total,
            estimatedDays: 2,
            isPickup: true,
            carrierName: "StorePickup"
        };
        return Promise.resolve(quote);
    }
}
exports.StorePickup = StorePickup;
