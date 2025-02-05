import { Router } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../config/prisma.js';
import { userAuthentication } from '../middleware/index.js';
const userRouter = Router();

userRouter.use(userAuthentication())

userRouter.put("/update-profile", async (req, res) => {
   try {
      const body = req.body
      const userId = req.user.id
      await prisma.users.update({
         where: { id: userId },
         data: body
      })
      res.status(200).json({ success: true, message: "Profile updated successfully" })
   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal Server Error" })
   }
})
userRouter.get("/profile", async (req, res) => {
   try {
      const userId = req.user.id
      const user = await prisma.users.findUnique({
         where: { id: userId },
      })
      res.status(200).json({ success: true, user })
   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal Server Error" })
   }
})
userRouter.get("/profile-with-leaves", async (req, res) => {
   try {
      const userId = req.user.id
      const user = await prisma.users.findUnique({
         where: { id: userId },
         include: {
            userLeave: {
               include: { leaveType: true }
            }
         },
      })
      res.status(200).json({ success: true, user })
   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal Server Error" })
   }
})
userRouter.put("/update-password", async (req, res) => {
   try {
      const { oldPassword, newPassword } = req.body
      const userId = req.user.id
      const user = await prisma.users.findUnique({
         where: { id: userId },
         select: {
            id: true,
            userAuth: true
         },
      })
      if (!user) {
         return res.status(409).json({ success: false, message: "User not found" })
      }
      if (user.userAuth === null) {
         return res.status(409).json({ success: false, message: "First reset your password" })
      }

      const checkOldPassword = bcrypt.compareSync(oldPassword, user?.userAuth?.password);
      if (!checkOldPassword) {
         return res.status(409).json({ success: false, message: "Old password is incorrect" })
      }
      const hashedPassword = bcrypt.hashSync(newPassword, 10)
      const updatePassword = await prisma.users.update({
         where: { id: userId },
         data: { userAuth: { update: { password: hashedPassword } } }
      })
      if (!updatePassword) {
         return res.status(409).json({ success: false, message: "Failed to update password" })
      }
      res.status(200).json({ success: true, message: "Password updated successfully" })
   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal Server Error" })
   }
})
userRouter.get("/my-leaves", async (req, res) => {
   try {
      const userId = req.user.id
      const user = await prisma.users.findUnique({
         where: { id: +userId },
         include: {
            userLeave: {
               include: {
                  leaveType: true
               }
            }
         },
      })
      res.status(200).json({ success: true, user })
   } catch (error) {
      console.log(error)
      res.status(500).json({ message: "Internal Server Error" })
   }
})


export default userRouter
