import {and, eq, sql} from "drizzle-orm";
import cmsClient from "../services/cmsClient.js";
import {findWidget} from "../db/webcontent.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {Router} from "express";


const router = Router(); // Create a router instead of using 'app'

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
    const domainId = parseInt(req.params.domainId);
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    const categoryId = (req.query.categoryId) || '';

    const posts = await cmsClient.search({
      limit: limit,
      offset: offset,
      categoryId: categoryId
    }, domainId)

    posts.total = 100;
    res.json(posts)
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