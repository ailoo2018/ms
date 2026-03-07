import {Client} from "@elastic/elasticsearch";


// Singleton instance
let client: any = null;

export function getElClient() {
	if (!client) {
		client = new Client({
			node: process.env.ELASTICSEARCH,
		});
	}
	return client;
}

export function getProductCollectionsIndexName(domainId: any){

	if(process.env.NODE_ENV === 'test'){
		return "test-product-collection"
	}

	return "product-collection";
}

export function getIndexName(domainId : any){

	if(process.env.NODE_ENV === 'test'){
		return "test-" + domainId + "-clp-0"
	}

	return domainId + "-clp-0";
}

export function getCmsIndexName(domainId: any){

	let name = "cms-";
	if(process.env.NODE_ENV === "test"){
		name = "test-cms-";
	}
	return name + domainId;
}


export function getDiscountIndexName(){
	if(process.env.NODE_ENV === 'test'){
		return "test-discounts"
	}
	return "discounts";
}


