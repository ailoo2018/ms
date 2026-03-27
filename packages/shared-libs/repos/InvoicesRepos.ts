import * as console from "node:console";




class InvoicesRepos {
	private productsService: any;
	get elClient(): any {
		return this._elClient;
	}

	set elClient(value: any) {
		this._elClient = value;
	}
	private _elClient: any;

	constructor({elClient, productsService}: { elClient: any, productsService: any }) {
		this._elClient = elClient;
		this.productsService = productsService;
	}


	async listSales(domainId: number, filters: any, page: number, itemsPerPage: number) {
		if (page == 0)
			page = 1

		let query = {
			"bool": {
				"must": [

					{
						"term": {
							"domainId": domainId
						}
					},

					{
						"terms": {
							"documentType": [0, 1, 5]
						}
					},

				] as any[]
			} as any
		}

		if (filters.from && filters.from.length > 0 && filters.to && filters.to.length > 0) {
			query.bool.must.push({
				"range": {
					"createDate": {
						"gte": filters.from.split('T')[0],
						"lte": filters.to.split('T')[0],
					}
				}
			})
		}


		if (filters.facilities && filters.facilities.length > 0) {
			query.bool.must.push({
				"terms": {
					"facility.id": filters.facilities.map((f:any) => f.id),
				}
			})
		}
		if (filters.saleTypes && filters.saleTypes.length > 0) {
			query.bool.must.push({
				"terms": {
					"saleType.id": filters.saleTypes.map((st:any) => st.id),
				}
			})
		}
		if (filters.brands && filters.brands.length > 0) {
			query.bool.must.push({
				"terms": {
					"brandsIds": filters.brands.map((b:any) => b.id),
				}
			})
		}
		if (filters.receivedByIds && filters.receivedByIds.length > 0) {
			query.bool.must.push({
				"terms": {
					"receivedBy.id": filters.receivedByIds,
				}
			})
		}
		if (filters.documentNumbers && filters.documentNumbers.length > 0) {
			query.bool.must.push({
				"terms": {
					"number": filters.documentNumbers,
				}
			})
		}

		if (filters.sword && filters.sword.length > 0) {
			const searchQuery = filters.sword
			query.bool.should = [
				// Exact number match gets highest priority
				{
					term: {
						"number.keyword": {
							value: searchQuery,
							boost: 5
						}
					}
				},
				// Partial number match
				{
					wildcard: {
						"number": {
							value: `*${searchQuery}*`,
							boost: 4
						}
					}
				},
				// Facility name match
				{
					match_phrase_prefix: {
						"facility.name": {
							query: searchQuery,
							boost: 3
						}
					}
				},
				// EmittedBy name match
				{
					match_phrase_prefix: {
						"emittedBy.name": {
							query: searchQuery,
							boost: 2
						}
					}
				},
				// EmittedBy RUT match
				{
					match: {
						"emittedBy.rut": {
							query: searchQuery,
							boost: 2
						}
					}
				},
				// EmittedBy email match
				{
					match: {
						"emittedBy.email": {
							query: searchQuery,
							boost: 1
						}
					}
				}
			];
			query.bool.minimum_should_match = 1;
			query.bool.filter = [
				{
					term: {
						"deleted": false
					}
				}
			];

		}

		console.log(JSON.stringify(query))

		// list sales of all coupons
		const body = await this._elClient.search({
			index: 'invoices',
			body: {
				from: (page - 1) * itemsPerPage,
				size: itemsPerPage,
				query: query,
				sort: [{id: "desc"}]
			}
		});

		var totalCount = body.hits.total.value

		var invoices = body.hits.hits.map((h:any) => {
			var inv = h._source
			inv.balance = inv.total - inv.paid;
			return inv;
		});


		var prodsIds: any[] = []
		for (var invoice of invoices) {
			if (invoice.productsIds && invoice.productsIds.length > 0)
				prodsIds = [...prodsIds, ...invoice.productsIds]
		}


		var productsMap = await this.productsService.getProductsMap(prodsIds, domainId);


		for (var invoice of invoices) {
			invoice.productItems = [];
			if (invoice.productItemsIds && invoice.productItemsIds.length > 0) {
				for (var pId of invoice.productItemsIds) {
					if (productsMap[pId]) {
						invoice.productItems.push(productsMap[pId])
					}
				}
			}
		}
		return {totalCount, invoices, query};
	}

}

module.exports = InvoicesRepos;
