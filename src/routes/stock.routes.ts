import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { addOption, addToWatchList, BuyNormal, deleteFromWatchList, getHoldings, getTransactions, getWatchlists, SellNormal, updateWatchList } from "../controllers/stock.controller.js";
import { getFrontData, quotedata, searchdata, stockData } from "../controllers/apidata.controller.js";
const router=Router()
router.route('/stockdata').post(stockData)
router.route('/search').post(searchdata)
router.route('/getfront').get(getFrontData)
router.route('/getquote').get(quotedata)
router.route('/buynormal').post(verifyJwt,BuyNormal)
router.route('/sellnormal').post(verifyJwt,SellNormal)
router.route('/limitorder').post(verifyJwt,addOption)
router.route('/getholdings').get(verifyJwt,getHoldings)
router.route('/gettransactions').get(verifyJwt,getTransactions)
router.route('/getwatchlists').get(verifyJwt,getWatchlists)
router.route('/addtowatchlists').post(verifyJwt,addToWatchList)
router.route('/deletefromwatchlists').delete(verifyJwt,deleteFromWatchList)
router.route('/updatewatchlists').post(verifyJwt,updateWatchList)



export default router