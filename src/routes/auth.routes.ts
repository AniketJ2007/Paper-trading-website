import {Router} from 'express'
import { getUser, LoginUser, RegisterUser } from '../controllers/auth.controller'
import { verifyJwt } from '../middlewares/auth.middleware'

const router=Router()

router.route('/register').post(RegisterUser)
router.route('/login').post(LoginUser)
router.route('/getuser').get(verifyJwt,getUser)

export default router

