import { Router } from "express";
import {db} from "../db/drizzle.js";

import schema from "../db/schema.js";

const router = Router();
const {
  contactMechanism,
  postalAddress,
  saleOrder,
  saleOrderItem,
  party,
  orderJournal
} = schema

router.get("/:domainId/orders/:orderId", async (req, res, next) => {

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

export default router