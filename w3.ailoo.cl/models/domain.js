const SaleType = Object.freeze({
  Store: 1,
   Distribution: 2,
   Internet: 3,
})

const OrderItemType = Object.freeze({
  Product: 0,
})

const PriceComponentType =
    {
      BASE_PRICE: 0,
      SUPPLIER_PRICE: 1,
      PROFIT_MARGIN: 2,
      DISCOUNT: 3,
      INTERNET: 4,
      DEALER_DISCOUNT: 5,
      BASE_NET_PRICE: 6,
      EXWORKS: 7,
      FOB: 8,
      MAX_DISCOUNT: 9


    };


class Money {
  constructor(amount, currency) {
    this.amount = amount || 0;
    this.currency = currency || 'CLP';
  }
}


// Missing Price class implementation
class Price {
  constructor(currency, saleTypeId) {
    this.currency = currency;
    this.saleTypeId = saleTypeId;
    this.priceComponents = [];
    this.domainId = 0;
    this.fromQuantity = 0;
    this.thruQuantity = Number.MAX_VALUE;
    this.finalPrice = {amount: 0};
  }

  get hasBasePrice() {
    return this.priceComponents.some(pc =>
        pc.type === PriceComponentType.BASE_PRICE);
  }

  addSaleTaxes(taxes) {
    // Implementation would go here
  }

  getBasePriceComponent() {
    for (var pc of this.priceComponents) {
      if (pc.type === PriceComponentType.BASE_PRICE || pc.type === PriceComponentType.BASE_NET_PRICE)
        return pc;
    }

    return null;

  }

  getDiscountPriceCompoent() {
    for (var pc of this.priceComponents) {
      if (pc.type === PriceComponentType.DISCOUNT)
        return pc;
    }

    return null;

  }

  getFinalPrice() {
    const basePrice = this.getBasePriceComponent();
    if (basePrice) {
      const discount = this.getDiscountPriceCompoent();
      if (discount) {
        if (discount.percent > 0) {
          const roundedAmount = Math.round(basePrice.price.amount * (1 - discount.percent / 100));
          return new Money(roundedAmount, basePrice.price.currency);
        } else {
          const finalAmount = basePrice.price.amount - discount.price.amount;
          return new Money(finalAmount, basePrice.price.currency);
        }
      } else {
        return basePrice.price;
      }
    }
    return new Money(0, "CLP");
  }
}



module.exports = {
  PriceComponentType,
  Price,
  Money,
  SaleType,
  OrderItemType
}