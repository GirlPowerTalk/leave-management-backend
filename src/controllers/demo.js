import { Router } from 'express'
import prisma from '../config/prisma.js';
import { leaveTypes, UsersData } from '../data/user.js';
const demoRouter = Router();

demoRouter.post('/create-employee', async (req, res) => {
   try {

      UsersData.forEach(async (user) => {
         const checkEmail = await prisma.users.findUnique({
            where: { email: user.email },
         })
         if (!checkEmail) {
            await prisma.users.create({
               data: user
            })
         }
      });

      return res.status(200).json({ success: true, message: 'Employee create successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})

demoRouter.post("/create-leave-types", async (req, res) => {
   try {
      leaveTypes.forEach(async (type) => {
         const checkName = await prisma.leaveType.findUnique({
            where: { name: type.name },
         })
         if (!checkName) {
            await prisma.leaveType.create({
               data: type
            })
         }
      });
      return res.status(200).json({ success: true, message: 'types create successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})

export default demoRouter