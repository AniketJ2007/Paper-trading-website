import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { addOption, BuyNormal, SellNormal } from "../controllers/stock.controller";
import { getFrontData, searchdata, stockData } from "../controllers/apidata.controller";
const router=Router()
router.route('/stockdata').post(stockData)
router.route('/search').post(searchdata)
router.route('/getfront').get(getFrontData)
router.route('/buynormal').post(verifyJwt,BuyNormal)
router.route('/sellnormal').post(verifyJwt,SellNormal)
router.route('/limitorder').post(verifyJwt,addOption)



export default router