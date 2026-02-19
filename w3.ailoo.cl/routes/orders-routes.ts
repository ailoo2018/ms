import { Router } from "express";

import {findOrder} from "../services/ordersService.js";

const router = Router();

router.get("/:domainId/orders/:orderId", async (req, res, next) => {

  try{
    const domainId = parseInt(req.params.domainId);
    const orderId = parseInt(req.params.orderId);

    const order = await findOrder(orderId, domainId)
    res.json(order);

  }catch(e){
    next(e)
  }

})

export default router