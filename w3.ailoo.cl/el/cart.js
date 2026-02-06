import {getElClient} from "../connections/el.js";


let INDEX = "shopping-cart";
if (process.env.NODE_ENV === "test") {
  INDEX = "test-shopping-cart";
}


export async function updateCartUserId(cartId, userId){

  await getElClient().update({
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

export async function updateCart(existingCart) {
  const result = await getElClient().update({
    index: INDEX,
    id: existingCart.id,
    doc: existingCart,
    refresh: true
  });

  return result;
}

export async function findCart(id) {
  if (id == null)
    return null;
  const result = await getElClient().get({
    index: INDEX,
    id: id
  })
  if (!result.body && !result.body._source) {
    return null;
  }

  var cart = result.body._source;
  cart.id = result.body._id;

  return cart;
}

export async function findCartByWuid(wuid) {
  const response = await getElClient().search({
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
    return null

  if (response.hits.hits.length > 0) {
    cart = response.hits.hits[0]._source
    cart.id = response.hits.hits[0]._id
  }
  if (response.hits.hits.length > 1) {
    var delHits = response.hits.hits.slice(1)
    for (var dh of delHits) {
      await getElClient().delete({
        index: INDEX, // Name of the index
        id: dh._id,       // ID of the document to delete
        refresh: 'wait_for',
      })
    }
  }

  return cart;
}

export async function addCart(cart) {
  const result = await getElClient().index({
    index: INDEX,
    body: cart,
    refresh: true
  });

  return result._id;
}

