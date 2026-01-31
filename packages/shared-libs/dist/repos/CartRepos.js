"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartRepos = void 0;
let INDEX = "shopping-cart";
if (process.env.NODE_ENV === "test") {
    INDEX = "test-shopping-cart";
}
class CartRepos {
    constructor({ elClient }) {
        this.elClient = elClient;
    }
    async updateCartUserId(cartId, userId) {
        await this.elClient.update({
            index: INDEX,
            id: cartId,
            // 'doc' allows you to send only the fields you want to change
            body: {
                doc: {
                    userId: userId
                }
            },
            // Optional: Wait for the change to be searchable
            refresh: true
        });
    }
    async updateCart(existingCart) {
        const result = await this.elClient.update({
            index: INDEX,
            id: existingCart.id,
            doc: existingCart,
            refresh: true
        });
        return result;
    }
    async findCart(id) {
        if (id == null)
            return null;
        const result = await this.elClient.get({
            index: INDEX,
            id: id
        });
        if (!result.body && !result.body._source) {
            return null;
        }
        var cart = result.body._source;
        cart.id = result.body._id;
        return cart;
    }
    async findCartByWuid(wuid) {
        const response = await this.elClient.search({
            index: INDEX,
            body: {
                query: {
                    term: {
                        "wuid.keyword": wuid
                    }
                }
            },
        });
        // if more than 1 response return first cart and delete others
        let cart = null;
        if (response.hits.hits.length === 0)
            return null;
        if (response.hits.hits.length > 0) {
            cart = response.hits.hits[0]._source;
            cart.id = response.hits.hits[0]._id;
        }
        if (response.hits.hits.length > 1) {
            var delHits = response.hits.hits.slice(1);
            for (var dh of delHits) {
                await this.elClient.delete({
                    index: INDEX, // Name of the index
                    id: dh._id, // ID of the document to delete
                    refresh: 'wait_for',
                });
            }
        }
        return cart;
    }
    async addCart(cart) {
        const result = await this.elClient.index({
            index: INDEX,
            body: cart,
            refresh: true
        });
        return result._id;
    }
}
exports.CartRepos = CartRepos;
