const {getElClient, getIndexName} = require("./index");


module.exports.findProduct=async (productId, domainId)=>{
  const response = await getElClient().get({
    index: getIndexName(domainId),
    id: productId
  });


  return response._source;
};


module.exports.findProductByProductItem=async (pitId, domainId)=>{
  const response = await getElClient().search({
    index: getIndexName(domainId),
    body: {
      "query": {
        "bool": {
          "filter": [
            {
              "term": {
                "domainId": domainId
              }
            },
            {
              "nested": {
                "path": "productItems",
                "query": {
                  "term": {
                    "productItems.id": pitId
                  }
                }
              }
            }
          ]
        }
      }
    }
  });

  if(response.hits.hits.length === 0){
    return null;
  }

  const product = response.hits.hits[0]._source;
 // const productItem = product.productItems.find(pit => pit.id === pitId);
  return product;
};
