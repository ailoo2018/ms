import {IShippingStrategy, ShippingQuote} from "./IShippingStrategy";
import {Money} from "../../models/universal.types";


export class StorePickup implements IShippingStrategy {
    calculate(vw: number, comunaId: number, domainId: number): Promise<ShippingQuote> {
        let total : Money = {amount: 0, unit: "CLP"}
        let quote : ShippingQuote = {
            cost: total,
            estimatedDays: 2,
            isPickup: true,
            carrierName: "StorePickup"
        };

        return Promise.resolve(quote);
    }

}