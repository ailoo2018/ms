

function getProductItemDescription(product, pit){
  let desc = product.name;

  if(pit.colorId > 0){
    const color = product.features.find(f => f.id === pit.colorId)
    desc += " " + color.name
  }

  if(pit.sizeId > 0){
    const size = product.features.find(f => f.id === pit.sizeId)
    desc += " " + size.name
  }

  return desc;

}

function getProductImage(product, pit){
  let img = product.image
  if(pit.colorId > 0){
    img = product.images.find(img => img.colorId === pit.colorId)

  }
  return img
}



const getPriceByProductItem = async (productItemsIds, saleTypeId, domainId) => {

  const baseUrl = process.env.PRODUCTS_MS_URL
  const ret =await fetch(`${baseUrl}/${domainId}/product-items/search`, {
    method: 'POST',
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json", // <--- Add this line
    },
    body: JSON.stringify({ productItemsIds, saleTypeId }),
  })

  if(ret.status !== 200){
    throw new Error(ret.statusText)
  }

  return await ret.json()
}



module.exports = { getProductItemDescription, getProductImage, getPriceByProductItem }