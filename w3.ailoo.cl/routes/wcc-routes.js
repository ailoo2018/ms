import {Router} from "express";
import {findWidget} from "../db/webcontent.js";

import cmsClient from "../services/cmsClient.js";

const router = Router();
const baseUrl = process.env.CMS_URL;


router.get('/:domainId/wcc/:id', async (req, res, next) => {

  try{
    const id = parseInt(req.params.id);
    const domainId = parseInt(req.params.domainId);

    const wccAux = await cmsClient.getWcc(id, domainId)

    const widgets = wccAux.children.filter(w => w.type === 3).map(w2 => {
      const component = cmsClient.getNuxtComponent(w2)
      return { id: w2.id, name: w2.name, configuration: w2.config, component };
    });

    res.json({
      widgets: widgets,
    })
  }catch(err){
    next(err)
  }

});


export default  router