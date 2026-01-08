const {getElClient, getIndexName} = require("./index");


module.exports.findProduct=async (productId, domainId)=>{
  const response = await getElClient().get({
    index: getIndexName(domainId),
    id: productId
  });


  return response._source;
};
