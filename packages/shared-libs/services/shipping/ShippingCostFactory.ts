import {ShippingMethod} from "../../models/shipping.types";
import {AlasXpress} from "./AlasXpress";
import {IShippingStrategy} from "./IShippingStrategy";
import {StorePickup} from "./StorePickup";

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