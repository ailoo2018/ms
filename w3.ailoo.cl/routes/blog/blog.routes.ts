import {and, eq, sql} from "drizzle-orm";
import cmsClient from "../../services/cmsClient.js";
import {findWidget} from "../../db/webcontent.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import {Router} from "express";
import {searchBlogEntries} from "../../services/cms/search.js";


const router = Router(); // Create a router instead of using 'app'

router.get("/:domainId/blog/articles/related/:id", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const articleId = parseInt(req.params.id);
        const limit = Number(req.query.limit) || 10;

        const posts = await cmsClient.search({
            limit: limit,
            isFeatured: true,
        }, domainId)

        res.json(posts)
    } catch (e) {
        next(e)
    }

})


router.get("/:domainId/blog/featured", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const limit = Number(req.query.limit) || 10;
        const categoryId = Number(req.query.categoryId) || 0;

        const posts = await cmsClient.search({
            limit: limit,
            isFeatured: true,
            categoryId: categoryId
        }, domainId)

        res.json(posts)
    } catch (e) {
        next(e)
    }

})

router.get("/:domainId/blog/search", async (req, res, next) => {
    try {
        const domainId: number = parseInt(req.params.domainId);
        const limit: number = Number(req.query.limit) || 10;
        const offset: number = Number(req.query.offset) || 0;
        const categoryId : string = (req.query.categoryId) || '';
        const sword : string = (req.query.sword) || '';

        const hits = await searchBlogEntries({
            limit: limit,
            offset: offset,
            categoryId: categoryId,
            sword: sword,
        }, domainId);

        let rs = {
            category: { id: '', name: sword?.length > 0 ? `Resultado de búsqueda '${sword}'` : '', friendlyUrl: ''},
            total: hits.total,
            entries: []

        };


        let entries = hits.hits.map(h => ({...h._source}));
        rs.entries = entries
        if(categoryId?.length > 0 && entries.length > 0) {
            let entry = entries.find(e => e.mainCategory.id === categoryId);
            if(entry)
                rs.category = entry.mainCategory;
        }



        res.json(rs)
    } catch (e) {
        next(e)
    }

})

router.get("/:domainId/blog/articles/:id", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const articleId = parseInt(req.params.id)

        const wcc = await findWidget(articleId, domainId)

        const wccAux = await cmsClient.getWcc(articleId, domainId)

        const widgets = wccAux.children.filter(w => w.type === 3).map(w2 => {
            const component = cmsClient.getNuxtComponent(w2)
            return { id: w2.id, name: w2.name, configuration: w2.config, component };
        });

        if(widgets){
            for(var w of widgets) {
                const wccDb = await drizzleDb.query.webContentConfiguration.findFirst({
                    where: (webContentConfiguration) => eq(webContentConfiguration.id, w.id),
                    columns: {
                        id: true,
                        template: true,
                    }
                });

                if(wccDb) {
                    w.template = wccDb.template
                }
            }

        }

        res.json({
            id: wcc.Id,
            name: wcc.Name,
            createDate: wcc.CreateDate,
            widgets,
            configuration: JSON.parse(wcc.Configuration),
            template: null,
        })
    } catch (e) {
        next(e)
    }

})

export default router;