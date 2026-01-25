import {Router} from 'express'
import { LoginUser, RegisterUser } from '../controllers/auth.controller'

const router=Router()

router.route('/register').post(RegisterUser)
router.route('/login').post(LoginUser)

export default router

