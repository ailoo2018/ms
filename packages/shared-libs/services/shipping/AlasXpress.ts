import {IShippingStrategy, ShippingQuote} from "./IShippingStrategy.js";
import {Money} from "../../models/universal.types.js";


export class AlasXpress implements IShippingStrategy {
    calculate(vw: number, comunaId: number, domainId: number): Promise<ShippingQuote> {
        let total : Money = {amount: 4900, unit: "CLP"}
        const quote : ShippingQuote = {
            cost: total,
            estimatedDays: 2,
            isPickup: false,
            carrierName: "AlasXpress"
        };

        return Promise.resolve(quote);
    }

}