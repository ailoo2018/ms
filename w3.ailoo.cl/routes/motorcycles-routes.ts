import { Router } from "express";
 // Create a router instead of using 'app'
import { bikeClient } from "../services/bikeClient.js";
import {validateJWT} from "../server.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq, sql} from "drizzle-orm";
import container from "../container/index.js";


const router = Router();

const motorcylcesService = container.resolve('motorcyclesService');


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

router.post("/motorcycles/add-user-bike", validateJWT, async (req, res, next) => {
  try{
    const userRq = req.user;
    const motorcycle = req.body

    const userConfig = await motorcylcesService.addUserBike(userRq.id, motorcycle)


    res.json(userConfig)
  }catch(e){
    next(e)
  }
})

router.post("/motorcycles/delete-user-bike", validateJWT, async (req, res, next) => {
  try{
    const userRq = req.user;
    const motorcycle = req.body

    const config = await motorcylcesService.deleteUserBike(userRq.id, motorcycle)

    res.json(config)
  }catch(e){
    next(e)
  }
})


router.get("/motorcycles/list-user-bikes", validateJWT, async (req, res, next) => {

  try{

    const bikes = await motorcylcesService.listUserBikes(req.user.id)

    res.json(bikes)
  }catch(err){
    next(err);
  }

})


export default router;