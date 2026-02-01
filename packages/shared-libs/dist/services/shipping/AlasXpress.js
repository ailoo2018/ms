"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlasXpress = void 0;
class AlasXpress {
    calculate(vw, comunaId, domainId) {
        let total = { amount: 4900, unit: "CLP" };
        const quote = {
            cost: total,
            estimatedDays: 2,
            isPickup: false,
            carrierName: "AlasXpress"
        };
        return Promise.resolve(quote);
    }
}
exports.AlasXpress = AlasXpress;
