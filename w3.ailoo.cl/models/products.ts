export interface Product {
    id: number;
    name: string;
    fullName: string;
    linkName: string;
    code: string;
    summary: string;
    description?: string; // Found in productItems
    categoryPath: string;
    image: string;
    images: ProductImage[];
    videos: Video[];
    unitsSold: number;
    rating: number;
    quantityInStock: number;
    universalQuantity: number;
    minPrice: number;
    maxPrice: number;
    availableInStore: boolean;
    isAvailableForInternet: boolean;
    isSimpleProduct: boolean;
    isReserved: boolean;
    isTaxExempt: boolean;
    isNew: boolean;
    preOrder: boolean;
    hasColor: boolean;
    hasSize: boolean;
    hasDiscount: boolean;
    discountAmount: number;
    discountPercent: number;
    domainId: number;
    googleProductCategory: number;
    inventoryControl: number;
    productType: number;
    orderWeight: number;
    motoOrderWeight: number;
    createDate: string; // ISO Date string
    modifiedDate: string; // ISO Date string
    brand: Brand;
    model: ProductModel;
    features: Feature[];
    availableSizes: Size[];
    tags: Tag[];
    tags2: any[];
    categories: Category[];
    parentCategories: Category[];
    directCategories: number[];
    directCategoryisAvailableForInternet: boolean;
    priceComponents: PriceComponent[];
    salesTaxes: SalesTax[];
    discounts: Discount[];
    productItems: ProductItem[];
    properties: Property[];
    propertiesMap: Record<string, string>;
    tireSpecs: any[];
    motorcycles: any[];
    motorbikeVersion: any[];
    requiresFeaturedSelect: boolean;
    requiresLot: boolean;
    mercadoLibre: Record<string, any>;
    sword: string;
}

// Nested Support Interfaces

interface ProductImage {
    id: number;
    image: string;
    colorId: number;
    colorName?: string;
    colorTagsIds: number[];
    orderWeight: number;
}

interface Video {
    url: string;
}

interface Brand {
    id: number;
    name: string;
    linkName: string;
    logo: string;
    featured: boolean;
    isAvailableForInternet: boolean;
    showNameInWeb: boolean;
}

interface ProductModel {
    id: number;
    name: string;
    image: string;
    videos: string[];
}

interface Feature {
    id: number;
    name: string;
    type: number;
    orderWeight: number;
}

interface Size {
    id: string;
    name: string;
    key: string;
    orderWeight: number;
}

interface Tag {
    id: number;
    name: string;
    type: string;
    categoryId: number;
    categoryName: string;
    filter: string;
    useInFilter: boolean;
    categoryOrderWeight: number;
}

interface Category {
    id: number;
    name: string;
    isDirectCategory: boolean;
}

interface PriceComponent {
    id: number;
    productId: number;
    productItemId: number;
    amount: number;
    currency: string;
    price: {
        amount: number;
        unit: string;
    };
    country: string;
    isBasePrice: boolean;
    isDiscount: boolean;
    isCalculated: boolean;
    percent: number;
    type: number;
    typeId: number;
    tagId: number;
    ruleId: number;
    packId: number;
    brandId: number;
    categoryId: number;
    fromQuantity: number;
    thruQuantity: number;
}

interface SalesTax {
    id: number;
    name: string;
    code: number;
    percentage: number;
}

interface Discount {
    id: number;
    amount: number;
    percent: number;
    validFrom: string;
    validThru: string;
    saleTypes: { id: number }[];
}

interface ProductItem {
    id: number;
    productId: number;
    colorId: number;
    sizeId: number;
    codes: string;
    barcode1: string;
    barcode2: string;
    description: string;
    sword: string;
}

interface Property {
    name: string;
    value: string;
    id: string; // e.g., "Certificación|ECE 2206"
}