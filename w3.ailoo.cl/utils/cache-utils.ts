import {db as redisDb, deleteKeysByPattern} from "../connections/rdb.js";

export function productCacheKey(productId: number, domainId: number){
    return `find-product:${domainId}:${productId}`;
}

export function brandsCacheKey( domainId: number){
    return `w3:brands:${domainId}`;
}


export async function deleteRedisProductCache(domainId: number) {
    const pattern = `find-product:${domainId}:*`; // Double check this pattern!

    // DEBUG: Check how many keys total are in your DB
    return await deleteKeysByPattern(pattern);
}