import { ShoppingCart } from "../models/cart.types";
export declare class CartRepos {
    private elClient;
    constructor({ elClient }: {
        elClient: any;
    });
    updateCartUserId(cartId: string, userId: number): Promise<void>;
    updateCart(existingCart: ShoppingCart): Promise<any>;
    findCart(id: string): Promise<any>;
    findCartByWuid(wuid: string): Promise<any>;
    addCart(cart: ShoppingCart): Promise<any>;
}
