import {and, eq, sql} from "drizzle-orm";
import sgMail from "../../connections/sendmail.js";
import cmsClient from "../../services/cmsClient.js";
import {findWidget} from "../../db/webcontent.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import {Router} from "express";
import {searchBlogEntries} from "../../services/cms/search.js";
import {getElClient} from "../../connections/el.js";
import {BlogComment} from "../../models/blog.types.js";


const router = Router(); // Create a router instead of using 'app'
const INDEX = "blog-comments";

router.get("/:domainId/blog/posts/:postId/comments", async (req, res, next) => {
    try{
        const postId = parseInt(req.params.postId);
        const domainId = parseInt(req.params.domainId);



        const query: any = {
            bool: {
                must: [
                    {term: {domainId: domainId}},
                    {term: {postId: postId}},
                ]
            }
        };

        if(req.query.all){

        }else{
            query.bool.must.push({term: { accept: true}})
        }


        const rs = await getElClient().search({
            index: INDEX,
            body: {
                query: query
            }

        })

        res.json({
            comments: rs.hits.hits.map(h => {
                return {...h._source, id: h._id};
            })
        })
    }catch(e){
        next(e)
    }
})

router.get("/:domainId/blog/approve-comment/:commentId", async (req, res, next) => {
    try{
        const commentId = req.params.commentId
        const rs = await getElClient().update({
            index: INDEX,
            id: commentId,
            // 'doc' allows you to send only the fields you want to change
            body: {
                doc: {
                    accept: true
                }
            },
            // Optional: Wait for the change to be searchable
            refresh: true
        });

        res.json(rs)
    }catch(e){
        next(e)
    }
})

router.post("/:domainId/blog/posts/:postId/comments", async (req, res, next) => {
    try {

        const domainId = parseInt(req.params.domainId);
        const postId = parseInt(req.params.postId);
        const comment : BlogComment = new BlogComment(req.body);

        comment.domainId = domainId

        comment.postId = postId;

        const result = await getElClient().index({
            index: "blog-comments",
            body: comment,
            refresh: true
        });

        comment.id = result._id;

        await sgMail.send({
            to: "jcfuentes@motomundi.net",
            from: 'ventas@motomundi.cl', // Change to your verified sender
            subject: `MOTOMUNDI - COMENTARIO A BLOG POST`,
            text: `Se recibio un comentario para post ${postId}: ${JSON.stringify(comment)}`,
        })

        res.json(comment);
    } catch (e) {
        next(e)
    }
})

router.get("/:domainId/blog/posts/related/:id", async (req, res, next) => {
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
        const categoryId: string = (req.query.categoryId) || '';
        const sword: string = (req.query.sword) || '';

        const hits = await searchBlogEntries({
            limit: limit,
            offset: offset,
            categoryId: categoryId,
            sword: sword,
        }, domainId);

        let rs = {
            category: {id: '', name: sword?.length > 0 ? `Resultado de búsqueda '${sword}'` : '', friendlyUrl: ''},
            total: hits.total,
            entries: []

        };


        let entries = hits.hits.map(h => ({...h._source}));
        rs.entries = entries
        if (categoryId?.length > 0 && entries.length > 0) {
            let entry = entries.find(e => e.mainCategory.id === categoryId);
            if (entry)
                rs.category = entry.mainCategory;
        }


        res.json(rs)
    } catch (e) {
        next(e)
    }

})

router.get("/:domainId/blog/posts/:id", async (req, res, next) => {
    try {
        const domainId = parseInt(req.params.domainId);
        const articleId = parseInt(req.params.id)

        const wcc = await findWidget(articleId, domainId)

        const wccAux = await cmsClient.getWcc(articleId, domainId)

        const widgets = wccAux.children.filter(w => w.type === 3).map(w2 => {
            const component = cmsClient.getNuxtComponent(w2)
            return {id: w2.id, name: w2.name, configuration: w2.config, component};
        });

        if (widgets) {
            for (var w of widgets) {
                const wccDb = await drizzleDb.query.webContentConfiguration.findFirst({
                    where: (webContentConfiguration) => eq(webContentConfiguration.id, w.id),
                    columns: {
                        id: true,
                        template: true,
                    }
                });

                if (wccDb) {
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