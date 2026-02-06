import {orderConfirmationHtml, sendOrderConfirmationEmail} from "../services/emailsService.js";
import {Router} from "express";

const router = Router(); // Create a router instead of using 'app'
router.get("/test-send", async (req, res, next) => {

    const domainId = 1
    const orderId = parseInt(req.query.orderId)
    const resp = await sendOrderConfirmationEmail(orderId, domainId);
    res.json(resp);
})

router.get("/test-email", async (req, res, next) => {

    const domainId = 1
    const orderId = parseInt(req.query.orderId)
    const {html} = await orderConfirmationHtml(orderId, domainId);
    res.send(html);
})


export default router