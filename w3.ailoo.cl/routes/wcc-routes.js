const {app} = require( "../server" );
const {findWidget} = require( "../db/webcontent" );
const cmsClient = require("../services/cmsClient")

const baseUrl = process.env.CMS_URL;
app.get('/:domainId/wcc/:id', async (req, res, next) => {

  try{
    const id = parseInt(req.params.id);
    const domainId = parseInt(req.params.domainId);

    var wccAux = await cmsClient.getWcc(id, domainId)
    res.json(wccAux)
  }catch(err){
    next(err)
  }

});


