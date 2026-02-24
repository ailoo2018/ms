import {getCmsIndexName, getElClient} from "../../connections/el.js";
import logger from "@ailoo/shared-libs/logger";

export interface CmsSearchCriteria {
    categoryId?: string;
    sword?: string;
    isFeatured?: boolean,
    limit?: number;
    offset?: number;

}


export async function searchBlogEntries(query: CmsSearchCriteria, domainId: number) {
    var q: any = {
        bool: {
            must: [
                {
                    terms: {
                        subtype: [6]
                    }
                }
            ]
        }
    };

    if (query.sword != null && query.sword.length > 0) {
        q.bool.must.push({
            multi_match: {
                query: query.sword,
                fields: ['content', 'title', 'metaDescription'] // Replace with your fields
            }
        });
    }
    if (query.categoryId != null && query.categoryId.length > 0) {
        q.bool.must.push({
            term: {
                "categories.id.keyword": query.categoryId // The specific ID you want to match
            }
        })
    }
    if (query.isFeatured) {
        q.bool.must.push({
            term: {
                "isFeatured": true // The specific ID you want to match
            }
        })
    }


    var limit = 50;
    if (query.limit > 0)
        limit = query.limit;

    const result = await getElClient().search({
        index: getCmsIndexName(domainId),
        body: {
            query: q,
            from: query.offset != null ? query.offset : 0,
            size: limit,
            sort: [
                {
                    id: {
                        order: 'desc'
                    }
                }
            ]
        },
        _source: {
            excludes: [
                "content",
                "assets",
                "keywords",
                "categories",
                "metaDescription",
                "type",
                "subtype",
                "isEnabled",
                "version"
            ]
        }
    });

    return result.hits;
}