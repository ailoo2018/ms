const { Client } = require("@elastic/elasticsearch");

// Singleton instance
let client = null;

function getElClient() {
	if (!client) {
		client = new Client({
			node: process.env.ELASTICSEARCH,
		});
	}
	return client;
}
// product-collection

function getIndexName(domainId){

	if(process.env.NODE_ENV === 'test'){
			return "test-" + domainId + "-clp-0"
	}

	return domainId + "-clp-0";
}

function getProductCollectionsIndexName(domainId){

	if(process.env.NODE_ENV === 'test'){
			return "test-product-collection"
	}

	return "product-collection";
}




function getDiscountIndexName(){
	if(process.env.NODE_ENV === 'test'){
		return "test-discounts"
	}
	return "discounts";
}


module.exports = {
	getElClient, getIndexName, getDiscountIndexName, getProductCollectionsIndexName
};