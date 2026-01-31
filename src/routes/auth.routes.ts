import {Router} from 'express'
import { getUser, LoginUser, logoutUser, RegisterUser } from '../controllers/auth.controller.js'
import { verifyJwt } from '../middlewares/auth.middleware.js'

const router=Router()

router.route('/register').post(RegisterUser)
router.route('/login').post(LoginUser)
router.route('/getuser').get(verifyJwt,getUser)
router.route('/logout').post(verifyJwt,logoutUser)

export default router

