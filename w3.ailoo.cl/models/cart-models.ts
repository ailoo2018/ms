export const CartItemType = Object.freeze({
  Product: 0,
  Coupon: 1,
  Discount: 2,
  Pack: 3
});

export interface Cart {
  id: string;
  wuid: string;
  notificationsCount: number;
  lastNotified: string; // Could also be Date if you parse it
  webSiteId: number;
  createDate: string;
  modifiedDate: string;
  currency: string;
  userId: number;
  domainId: number;
  items: CartItem[];
  totalItems: number;
  oldPrice: number;
  destination: Record<string, unknown>; // Empty object in JSON
  points: number;
  total: number;
  shipping: ShippingInfo;
  iva: number;
  financing: FinancingInfo;
  netTotal: number;
  shipmentMethod: ShipmentMethod;
}

export interface CartItem {
  image: string;
  product: Product;
  quantity: number;
  color: string | null;
  oldPrice: number;
  description: string;
  discount: number;
  type: number;
  packId: number;
  size: ItemSize;
  price: number;
  name: string;
  id: string;
  coupon: any;
}

export interface Product {
  image: string;
  productItemId: number;
  name: string;
  type: number;
  url: string;
}

export interface ItemSize {
  id: number;
  name: string;
  orderWeight: number;
  type: number;
}

export interface ShippingInfo {
  cost: number;
}

export interface FinancingInfo {
  installments: number;
  cuota: number;
}

export interface ShipmentMethod {
  id: number;
}