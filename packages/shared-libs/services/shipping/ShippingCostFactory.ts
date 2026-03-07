import {ShippingMethod} from "../../models/shipping.types.js";
import {AlasXpress} from "./AlasXpress.js";
import {IShippingStrategy} from "./IShippingStrategy.js";
import {StorePickup} from "./StorePickup.js";

const STRATEGIES: Record<number, new () => IShippingStrategy> = {
    [ShippingMethod.AlasXpress]: AlasXpress,
    [ShippingMethod.Store]: StorePickup,
};

export class ShippingCostFactory {

    static create(methodId: number, domainId: number): IShippingStrategy {
        const StrategyClass = STRATEGIES[methodId];
        if (!StrategyClass) {
            throw new Error(`Unsupported shipping method: ${methodId}`);
        }
        return new StrategyClass();
    }
}