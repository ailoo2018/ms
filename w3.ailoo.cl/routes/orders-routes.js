const {db} = require("../db/drizzle")
const {app} = require("../server");



app.get("/:domainId/orders/:orderId", async (req, res, next) => {

  try{
    const domainId = parseInt(req.params.domainId);
    const orderId = parseInt(req.params.orderId);

    const result = await db.query.saleOrder.findFirst({
      where: (saleOrder, { eq }) => eq(saleOrder.id, orderId),
      // This automatically joins the items table defined in our relations
      with: {
        items: true,
      },
    });

    res.json(result);

  }catch(e){
    next(e)
  }

})