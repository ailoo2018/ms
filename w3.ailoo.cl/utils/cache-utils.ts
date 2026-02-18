export function productCacheKey(productId: number, domainId: number){
    return `find-product:${domainId}:${productId}`;
}