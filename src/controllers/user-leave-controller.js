import { Router } from 'express'
import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';
import { userAuthentication } from '../middleware/index.js';

const transporter = nodemailer.createTransport({
   service: "Gmail",
   auth: {
      user: process.env.CENTRAL_EMAIL_ADDRESS,
      pass: process.env.CENTRAL_EMAIL_PASSWORD,
   },
});

const userLeaveRouter = Router();
userLeaveRouter.use(userAuthentication())
userLeaveRouter.post('/create-leave', async (req, res) => {
   try {
      const user = req.user
      const body = req.body

      const transformedLeaves = body.leaves.flatMap(({ leaveTypeId, dates }) =>
         dates.map(d => ({ leaveDate: d, leaveTypeId, userId: +user.id }))
      );

      const transaction = await prisma.$transaction(async (prisma) => {
         // Create the leave application
         const createLeave = await prisma.leaveApplication.create({
            data: {
               userId: +user.id,
               subject: body.subject,
               reason: body.reason,
               leaveApplicationDetails: {
                  create: body.leaves.map(leave => ({
                     leaveType: { connect: { id: leave.leaveTypeId } },
                     leaveCount: leave.leaveCount,
                     leaveDates: leave.dates
                  }))
               }
            }
         });

         // Create leaveApplicationCalender entries linked to the leave application
         const createCalender = await prisma.leaveApplicationCalender.createMany({
            data: transformedLeaves.map(leave => ({
               applicationId: createLeave.id,
               leaveTypeId: leave.leaveTypeId,
               userId: leave.userId,
               leaveDate: leave.leaveDate
            }))
         });

         await Promise.all(
            body.leaves.map(leave =>
               prisma.userLeave.update({
                  where: {
                     userId_leaveTypeId: {
                        userId: +user.id,
                        leaveTypeId: +leave.leaveTypeId
                     }
                  },
                  data: {
                     pendingLeaves: {
                        increment: +leave.leaveCount
                     }
                  }
               })
            )
         );

         return { createLeave, createCalender }
      });

      if (transaction.createLeave) {
         var mailOptions = {
            from: {
               name: 'Leave Application',
               address: 'leave.reply@girlpowertalk.com'
            },
            to: [user?.email, 'leave@girlpowertalk.com'],
            subject: body?.subject,
            html: body?.reason
         };
         transporter.sendMail(mailOptions);
      }

      return res.status(201).json({ success: true, message: 'Leave was successfully created' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})
userLeaveRouter.put("/cancel-application/:id", async (req, res) => {
   try {
      const user = req.user
      const apploicationId = req.params.id
      const application = await prisma.leaveApplication.findUnique({
         where: {
            id_userId: {
               id: parseInt(apploicationId), userId: +user.id
            }
         },
         select: {
            leaveApplicationDetails: true
         }
      })
      if (application?.status === 'cancelled') {
         return res.status(409).json({ success: false, message: 'Application already cancelled' })
      }
      const transaction = await prisma.$transaction(async (prisma) => {
         const cancelLeave = await prisma.leaveApplication.update({
            where: { id: parseInt(apploicationId) },
            data: {
               status: 'cancelled'
            }
         });
         await Promise.all(
            application.leaveApplicationDetails?.map(leave =>
               prisma.userLeave.update({
                  where: {
                     userId_leaveTypeId: {
                        userId: +user.id,
                        leaveTypeId: +leave.leaveTypeId
                     }
                  },
                  data: {
                     totalLeaves: {
                        increment: +leave.leaveCount
                     }
                  }
               })

            )
         );
         return { cancelLeave }
      })
      return res.status(201).json({ success: true, message: 'Leave application successfully cancelled' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})
userLeaveRouter.get("/applications", async (req, res) => {
   try {
      const userId = req.user.id
      const applications = await prisma.leaveApplication.findMany({
         where: { userId },
         include: {
            leaveApplicationDetails: {
               include: {
                  leaveType: {
                     select: {
                        name: true
                     }
                  },
               }
            },
         }
      })
      res.status(200).json({ success: true, applications })
   } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: 'Error retrieving applications', error })
   }
})
userLeaveRouter.get("/read-application/:id", async (req, res) => {
   try {
      const application = await prisma.leaveApplication.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            leaveApplicationDetails: {
               include: {
                  leaveType: {
                     select: {
                        name: true
                     }
                  }
               }
            },
         }
      })
      res.status(200).json({ success: true, application })
   } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: 'Error retrieving application', error })
   }
})
export default userLeaveRouter



