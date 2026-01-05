const {app} = require("../server");
const cmsClient = require("../services/cmsClient");


app.get('/:domainId/events/latest', async (req, res, next) => {

  try{
    let limit = 10;
    if(req.query.limit)
      limit = parseInt(req.query.limit);

    const domainId = parseInt(req.params.domainId);


    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evRs = await cmsClient.searchEvents({
      limit: limit,
      from: today.toISOString(),
      status: "Approved"

    }, domainId)


    res.json(evRs)
  }catch(err){
    next(err)
  }

});
