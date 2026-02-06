import {Client} from "@elastic/elasticsearch";


// Singleton instance
let client = null;

export function getElClient() {
	if (!client) {
		client = new Client({
			node: process.env.ELASTICSEARCH,
		});
	}
		return client;
}

export function getProductCollectionsIndexName(domainId){

	if(process.env.NODE_ENV === 'test'){
		return "test-product-collection"
	}

	return "product-collection";
}

export function getIndexName(domainId){

	if(process.env.NODE_ENV === 'test'){
			return "test-" + domainId + "-clp-0"
	}

	return domainId + "-clp-0";
}

export function getDiscountIndexName(){
	if(process.env.NODE_ENV === 'test'){
		return "test-discounts"
	}
	return "discounts";
}


