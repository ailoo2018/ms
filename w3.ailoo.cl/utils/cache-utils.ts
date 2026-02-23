export function productCacheKey(productId: number, domainId: number){
    return `find-product:${domainId}:${productId}`;
}

export function brandsCacheKey( domainId: number){
    return `w3:brands:${domainId}`;
}