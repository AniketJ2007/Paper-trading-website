import e, { json,urlencoded } from 'express'
import userrouter from "../src/routes/auth.routes"
import stockrouter from "../src/routes/stock.routes"
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import dotenv from 'dotenv'
import cookieparser from 'cookie-parser'
import { startPolling } from './controllers/limitorder.controller';
import cors from 'cors'

dotenv.config({
  path: './.env',
});
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
const app=e()

const corsOptions = {
  origin: 'http://localhost:5173',
  optionsSuccessStatus: 200,
  methods:['GET','POST','UPDATE','DELETE']
}
app.use(cors(corsOptions))
app.use(cookieparser())
app.use(json())
app.use(urlencoded({ extended: true }));
app.use('/api/v1/auth',userrouter)
app.use('/api/v1/stock',stockrouter)
app.listen(3000, () => {
    console.log(`Server is running port ${3000}`);
    setTimeout(() => {
      startPolling()
    }, 15000);
    
});


export {db}

