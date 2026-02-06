export const SaleType = Object.freeze({
  Store: 1,
  Distribution: 2,
  Internet: 3,
})

export const OrderItemType = Object.freeze({
  Product: 1,
  Shipping: 2,
  Discount: 3,
  Other: 4,
  Coupon: 5
})

export const OrderState = Object.freeze({
  Desconocido: 0,
  Ingresado: 1,
  Pagado: 2,
  Enviado: 3, // es InRoute, producto fue retirado por courrier y va en camino hacia el cliente
  Anulado: 4,
  PendientePago: 5,
  Abierto: 6,
  Rechazado: 7, //se trato de entregar producto donde cliente pero no se pudo
  ListoParaRetiro: 8, // solo se usa para pickup en tienda (NO ES LO MISMO QUE LISTO PARA ENVIAR
  Retirado: 9, // NO SE USA M�S, USAR ENTREGADO
  Entregado: 10,
  PaymentError: 11,
  ListoParaEnviar: 12, // OC ya esta preparado y se solicita a empresa de transporte recoger
  Comment: 13,
  DerivadoSAC: 14,
  EnProceso: 15 // edson usa este estado para los pedidos que se van a demorar un poco m�s de usual (solicitar retiro a proveedor o tiendas de region)

})

export const ShipmentMethodType = Object.freeze({
  StorePickup: 9
})

export const PriceComponentType =
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

export const ProductType = Object.freeze({
  Simple: 0,
  Composite: 1
})

export const ProductFeatureType = Object.freeze({
  Size: 0,
  Color: 1
})

export class Money {
  constructor(amount, currency) {
    this.amount = amount || 0;
    this.currency = currency || 'CLP';
  }
}

// Missing Price class implementation
export class Price {
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


export const PaymentMethodType = Object.freeze({
  MercadoPago: 15,
  Webpay: 8,
})

/*
export  {
  PriceComponentType,
  Price,
  Money,
  SaleType,
  OrderItemType,
  OrderState,
  PaymentMethodType,
  ProductType,
  ProductFeatureType,
  ShipmentMethodType,
}*/
