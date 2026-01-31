// Enums for type safety
export enum ProductType {
    Simple = 0,
    Pack = 1
}

export enum AttributeType {
    Size = 0,
    Color = 1
}

// Base interfaces
export interface ProductReference {
    image?: string;
    productItemId: number;
    name: string;
    type: ProductType;
    url?: string;
    id?: number;
    price?: number;
}

export interface Size {
    id: number;
    name: string;
    orderWeight: number;
    type: AttributeType;
}

export interface Color {
    id: number;
    name: string;
    orderWeight: number;
    type: AttributeType;
}

export interface CartItemBase {
    packId?: number;
    product?: ProductReference;
    quantity: number;
    name: string;
    id: string | number;
    type: ProductType;
    price: number;
    oldPrice?: number;
    discount?: number;
    image?: string;
}

export interface SimpleCartItem extends CartItemBase {
    type: ProductType.Simple;
    color?: Color | null;
    size?: Size;
    description?: string;
}

export interface PackCartItem extends CartItemBase {
    type: ProductType.Pack;
    packContents: PackContent[];
}

export interface PackContent {
    packId?: number;
    product: ProductReference;
    quantity: number;
    name: string;
    id: number;
    type: ProductType;
    price: number;
    oldPrice?: number;
    discount?: number;
    color?: Color;
    size?: Size;
    image?: string;
}

export type CartItem = SimpleCartItem | PackCartItem;

export interface Shipping {
    cost: number;
}

export interface Financing {
    installments: number;
    cuota: number;
}

export interface ShoppingCart {
    id?: string;
    wuid: string;
    notificationsCount?: number;
    lastNotified?: string;
    webSiteId?: number;
    createDate?: Date;
    modifiedDate?: string;
    currency?: string;
    userId?: number;
    domainId: number;
    items?: CartItem[];
    totalItems?: number;
    oldPrice?: number;
    total?: number;
    shipping?: Shipping;
    iva?: number;
    financing?: Financing;
    netTotal?: number;
}