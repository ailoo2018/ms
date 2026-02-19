import { Router } from "express";
import logger from "@ailoo/shared-libs/logger";

import {findOrder} from "../services/ordersService.js";

const router = Router();

router.get("/:domainId/orders/:orderId", async (req, res, next) => {

  try{
    const domainId = parseInt(req.params.domainId);
    const orderId = parseInt(req.params.orderId);

    logger.info(`recovering order: ${orderId} ${domainId}`)

    const order = await findOrder(orderId, domainId)

    logger.info(`order is: ${JSON.stringify(order)}`)
    res.json(order);

  }catch(e){
    next(e)
  }

})

export default router