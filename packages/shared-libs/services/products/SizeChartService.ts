export class SizeChartService {

    private elClient: any;


    constructor({elClient}: { elClient: any }) {
        this.elClient = elClient;
    }

    async findAllThatApplyToProduct(prodSm: any, domainId: number) {

        const query = {
            bool: {
                must: [] as any
            }
        }

        query.bool.must.push({ term: { domainId: domainId } })


        const tagIds = prodSm.tags?.map((tag: any) => tag.id) || [];
        if (tagIds.length > 0) {
            query.bool.must.push({
                bool: {
                    should: [
                        { terms: { "tags.id": tagIds } },
                        { bool: { must_not: { exists: { field: "tags" } } } }
                    ],
                    // Ensures at least one of the above must match
                    minimum_should_match: 1
                }
            });

        }

        if (prodSm.brand?.id > 0) {

            query.bool.must.push({
                bool: {
                    should: [
                        { terms: { "brands.id": [prodSm.brand.id] } },
                        { bool: { must_not: { exists: { field: "brands" } } } }
                    ],
                    minimum_should_match: 1
                }
            });
        }


        const catIds = prodSm.categories?.map((tag: any) => tag.id) || [];
        if (catIds != null) {
            query.bool.must.push({
                bool: {
                    should: [
                        { terms: { "categories.id": catIds } },
                        { bool: { must_not: { exists: { field: "categories" } } } }
                    ],
                    minimum_should_match: 1
                }
            });


        }

        const result = await this.elClient.search({
            index: "sizecharts",
            query: query,
        })

        return result.hits.hits.map((h: any) =>{ return {...h._source} })

    }
}

