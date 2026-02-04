"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = exports.AppliesToEnum = void 0;
const { v4: uuidv4 } = require('uuid');
const ShippingCostFactory_1 = require("./shipping/ShippingCostFactory");
const shipping_types_1 = require("../models/shipping.types");
// --- Supporting Interfaces ---
exports.AppliesToEnum = {
    Unknown: 0,
    CheapestItem: 1,
    TotalApplicableItems: 2,
    TotalApplicableItemsOneSale: 3,
};
// --- Helper Functions ---
function getPriceOfCheapestItem(applicableItems) {
    if (!applicableItems || applicableItems.length === 0) {
        return null;
    }
    return applicableItems.reduce((cheapest, current) => {
        return (current.item.price < cheapest.price) ? current.item : cheapest;
    }, applicableItems[0].item);
}
function GetTotalOfApplicableItems(applicableItems) {
    let total = 0;
    for (const ai of applicableItems) {
        total += (ai.item.price ?? 0) * ai.quantity;
    }
    return total;
}
// --- Main Service ---
class CartService {
    constructor({ productCategoryService, discountRuleService, cartRepository, shippingService }) {
        this._productCategoryService = productCategoryService;
        this.discountRuleService = discountRuleService;
        this._cartRepository = cartRepository;
        this.shippingService = shippingService;
    }
    async applies(productRuleDto, item, domainId, discountRule) {
        try {
            let qty = 0;
            if (!item.quantity || !productRuleDto.quantity || !item.product) {
                return { applies: false, qty: 0 };
            }
            const product = item.product;
            // Categories Check
            if (productRuleDto.categories && productRuleDto.categories.length > 0) {
                let idCategoryAux = 0;
                for (const ruleCategory of productRuleDto.categories) {
                    let hasMatch = false;
                    for (const dc of product.directCategories || []) {
                        const hasParent = await this._productCategoryService.isOrHasParent(dc, ruleCategory.id, domainId);
                        if (hasParent) {
                            hasMatch = true;
                            break;
                        }
                    }
                    if (hasMatch) {
                        idCategoryAux = ruleCategory.id;
                        break;
                    }
                }
                if (idCategoryAux === 0)
                    return { applies: false, qty: 0 };
            }
            // Brands Check
            if (productRuleDto.brands && productRuleDto.brands.length > 0) {
                if (!productRuleDto.brands.some(b => b.id === product.BrandId)) {
                    return { applies: false, qty: 0 };
                }
            }
            // Tags Check
            if (productRuleDto.tags && productRuleDto.tags.length > 0) {
                const hasTag = productRuleDto.tags.some(tag => product.tags && product.tags.some((ptag) => ptag.id === tag.id));
                if (!hasTag)
                    return { applies: false, qty: 0 };
            }
            // Products Check
            if (productRuleDto.products && productRuleDto.products.length > 0) {
                if (!productRuleDto.products.some(prd => prd.id === product.id)) {
                    return { applies: false, qty: 0 };
                }
            }
            // Price Check
            if (item.price < (productRuleDto.minPrice ?? 0)) {
                return { applies: false, qty: 0 };
            }
            // Quantity Calculation
            if (discountRule.appliesTo === exports.AppliesToEnum.TotalApplicableItemsOneSale) {
                qty = Math.floor(item.quantity);
            }
            else {
                qty = Math.min(productRuleDto.quantity, Math.floor(item.quantity));
            }
            return { applies: true, qty: qty };
        }
        catch (e) {
            console.error(e);
            return { applies: false, qty: 0 };
        }
    }
    async getDiscounts(rq, discountRule, domainId) {
        const discounts = [];
        let invoiceItem;
        if (discountRule.rules.length === 0) {
            let total = rq.items.reduce((sum, item) => sum + (item.quantity * (item.price ?? 0)), 0);
            let discountAmount = 0;
            if (discountRule.discount.type === "%") {
                discountAmount = Math.round(total * (discountRule.discount.amount / 100) * -1);
            }
            invoiceItem = {
                uid: uuidv4(),
                type: "DISCOUNT",
                name: discountRule.name,
                comment: discountRule.name,
                price: discountAmount,
                isCreatedByRule: true,
                quantity: 1,
                position: rq.items.length + 1,
                appliedDiscount: {
                    id: discountRule.id,
                    name: discountRule.name,
                    discount: discountRule.discount
                }
            };
            discounts.push(invoiceItem);
            return discounts;
        }
        let applicableItems = [];
        const MAX_ITERATIONS = 5000;
        let safetyNet = 0;
        let position = 2;
        for (let i = 0; i < rq.items.length; i++) {
            safetyNet++;
            if (safetyNet > MAX_ITERATIONS)
                break;
            let item = rq.items[i];
            let totalQuantityOfDiscountRule = discountRule.rules.reduce((sum, r) => sum + r.quantity, 0);
            for (let productRule of discountRule.rules) {
                if (!productRule.currentCount)
                    productRule.currentCount = 0;
                if (productRule.currentCount === productRule.quantity)
                    continue;
                const { applies, qty } = await this.applies(productRule, item, domainId, discountRule);
                if (applies) {
                    applicableItems.push({ item: item, quantity: qty });
                    let leftOver = 0;
                    if (productRule.currentCount + qty > productRule.quantity) {
                        leftOver = (productRule.currentCount + qty) - productRule.quantity;
                        productRule.currentCount = productRule.quantity;
                    }
                    else {
                        productRule.currentCount += qty;
                    }
                    const currentTotalCount = discountRule.rules.reduce((sum, r) => sum + (r.currentCount ?? 0), 0);
                    if (currentTotalCount === totalQuantityOfDiscountRule) {
                        let discountAmount = 0;
                        let appliesTo = [];
                        let cheapestItem;
                        let totalApplicableItems;
                        if (discountRule.discount.type === "%") {
                            if (discountRule.appliesTo === exports.AppliesToEnum.CheapestItem) {
                                cheapestItem = getPriceOfCheapestItem(applicableItems);
                                discountAmount = Math.round((cheapestItem.price ?? 0) * (discountRule.discount.amount / 100) * -1);
                                cheapestItem.discount = { amount: discountAmount, type: "$" };
                                appliesTo.push(cheapestItem);
                            }
                            else {
                                totalApplicableItems = GetTotalOfApplicableItems(applicableItems);
                                discountAmount = Math.round(totalApplicableItems * (discountRule.discount.amount / 100) * -1);
                            }
                        }
                        else {
                            discountAmount = discountRule.discount.amount * -1;
                            if (discountRule.appliesTo === exports.AppliesToEnum.CheapestItem) {
                                cheapestItem = getPriceOfCheapestItem(applicableItems);
                                cheapestItem.discount = { amount: discountAmount, type: "$" };
                                appliesTo.push(cheapestItem);
                            }
                        }
                        invoiceItem = {
                            uid: uuidv4(),
                            type: "DISCOUNT",
                            name: discountRule.name,
                            applicableItems: applicableItems.map(ai => ai.item),
                            appliesTo: appliesTo,
                            comment: discountRule.name,
                            price: discountAmount,
                            appliedDiscount: {
                                id: discountRule.id,
                                name: discountRule.name,
                                discount: discountRule.discount,
                                appliedTo: "" + discountRule.appliesTo
                            },
                            isCreatedByRule: true,
                            quantity: 1,
                            position: position
                        };
                        discounts.push(invoiceItem);
                        applicableItems.forEach(ai => ai.item.quantity -= ai.quantity);
                        i = -1; // Reset loop
                        discountRule.rules.forEach(r => r.currentCount = 0);
                        applicableItems = [];
                        if (leftOver > 0) {
                            productRule.currentCount = leftOver;
                            applicableItems.push({ item: item, quantity: leftOver });
                        }
                        break;
                    }
                }
            }
            position++;
        }
        discountRule.rules.forEach(r => r.currentCount = 0);
        return discounts;
    }
    async analyze(saleContext, discountRuleId, domainId) {
        const discountRule = await this.discountRuleService.findDiscount(discountRuleId, domainId);
        if (!discountRule)
            return [];
        const discounts = await this.getDiscounts(saleContext, discountRule, domainId);
        return { discounts, rule: discountRule };
    }
    async volumetricWeight(cart, domainId) {
        return 0;
    }
    async save(cart) {
        this._cartRepository.addCart(cart);
    }
    async update(cart) {
        await this._cartRepository.updateCart(cart);
    }
    async listShippingQuotes(cart, comunaId, domainId) {
        var methods = await this.shippingService.listShippingMethods(domainId);
        const quotes = [];
        var volumetricWeight = await this.volumetricWeight(cart, domainId);
        for (var m of methods) {
            const strategy = ShippingCostFactory_1.ShippingCostFactory.create(m.Id, domainId);
            const quote = await strategy.calculate(volumetricWeight, comunaId, domainId);
            quotes.push({
                shippingMethod: { id: m.Id, name: m.Name },
                quote: quote,
            });
        }
        var rs = {
            destination: {
                comunaId: comunaId,
            },
            methods: []
        };
        for (const q of quotes) {
            const preparationDays = await this.calculatePreparationTime(cart, domainId);
            // Logic for Dates
            let fromDate = new Date();
            let toDate = new Date();
            // Fix: Add preparation days AND estimated delivery days
            fromDate.setDate(fromDate.getDate() + (q.quote.estimatedDays + preparationDays.from));
            toDate.setDate(toDate.getDate() + (q.quote.estimatedDays + preparationDays.to));
            const methodEntry = {
                id: q.shippingMethod.id,
                name: q.shippingMethod.name,
                price: q.quote.cost.amount,
                oldPrice: q.quote.cost.amount,
                preparationDays: preparationDays,
                estimatedDays: q.quote.estimatedDays,
                eta: { from: fromDate, to: toDate },
                type: q.shippingMethod.id === shipping_types_1.ShippingMethod.Store
                    ? shipping_types_1.ShipmentCategoryType.ClickAndCollect
                    : shipping_types_1.ShipmentCategoryType.HomeDelivery,
            };
            rs.methods.push(methodEntry);
        }
        return rs;
    }
    async calculatePreparationTime(cart, domainId) {
        return Promise.resolve({ from: 3, to: 4 });
    }
}
exports.CartService = CartService;
