// main file
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import http from 'http'
import authorizationRouter from "./controllers/authorization.js"
import leaveFormatRouter from "./controllers/leaveFormat.js"
import { jobStart } from "./config/scheduled.js"
import leaveTypeRouter from "./controllers/leaveType.js"
import userRouter from "./controllers/user.js"
import userLeaveRouter from "./controllers/user-leave-controller.js"
import adminLeaveRouter from "./controllers/admin-leave-controller.js"
import { redis } from "./config/redis.js"
import holidayRouter from "./controllers/holiday-controller.js"
import adminUserRouter from "./controllers/admin-user-coltroller.js"
import adminDepartmentRouter from "./controllers/admin/department-controller.js"
import adminDesignationRouter from "./controllers/admin/designation-controller.js"

const app = express()
dotenv.config()

// handle Uncaught Exception
process.on("uncaughtException", err => {
   console.log(`Error: ${err.message}`)
   process.exit(1)
})
// redis
redis.on("connect", () => {
   console.log("Connected to Redis")
})
// cors origin define
app.use(
   cors({
      origin: [`${process.env.ALLOWED_ORIGIN}`],
      allowMethods: ["POST", "GET", "PUT", "DELETE"],
      credentials: true
   })
);
app.use(express.json());
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json

const server = http.createServer(app);

// Routes
app.get('/', (req, res) => {
   res.send('Hello World!')
});

app.use('/api/auth', authorizationRouter)
app.use('/api/admin/employees', adminUserRouter)
app.use('/api/admin/leave-format', leaveFormatRouter)
app.use('/api/admin/leave-type', leaveTypeRouter)
// department
app.use("/api/admin/department", adminDepartmentRouter)
//designation
app.use("/api/admin/designation", adminDesignationRouter)

// app.use("/api/user/leave-application", leaveApplicationRouter)
app.use("/api/employee/leave-application", userLeaveRouter)
app.use("/api/admin/leave-application", adminLeaveRouter)
app.use("/api/user", userRouter)
// 
app.use('/api/holiday', holidayRouter)

server.listen(process.env.PORT || 8090, () => {
   console.log(`Port ${process.env.PORT || 8090}`);
   jobStart()
});