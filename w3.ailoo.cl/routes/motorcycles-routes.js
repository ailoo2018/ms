import { Router } from "express";
 // Create a router instead of using 'app'
import { bikeClient } from "../services/bikeClient.js";

const router = Router();
router.get("/motorcycles/manufacturers", async (req, res, next) => {

  try{
    const brands = await bikeClient.listBrands()
    res.json(brands)
  }catch(err){
    next(err);
  }

})

router.get("/motorcycles/models", async (req, res, next) => {

  try{

    const brandId = parseInt(req.query.brandId)

    const models = await bikeClient.listModels(brandId)
    res.json(models)
  }catch(err){
    next(err);
  }

})

router.get("/motorcycles/years", async (req, res, next) => {

  try{

    const brandId = parseInt(req.query.brandId)
    const modelId = parseInt(req.query.modelId)


    const models = await bikeClient.listYears(modelId, brandId)
    res.json(models)
  }catch(err){
    next(err);
  }

})

export default router;