import { Router } from 'express'
import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';
import { userAuthentication } from '../middleware/index.js';

const transporter = nodemailer.createTransport({
   service: "Gmail",
   auth: {
      user: process.env.CENTRAL_EMAIL_ADDRESS,
      pass: process.env.CENTRAL_EMAIL_PASSWORD,
   }
});

const userLeaveRouter = Router();
userLeaveRouter.use(userAuthentication())
userLeaveRouter.post('/create-leave', async (req, res) => {
   try {
      const user = req.user
      const body = req.body
      console.log(body)

      // const transformedLeaves = body.leaves.flatMap(({ leaveTypeId, dates }) =>
      //    dates.map(d => ({ leaveDate: d, leaveTypeId, userId: +user.id }))
      // );

      const transformedLeaves = body.leaves?.flatMap(leave =>
         leave.dates.map(date => ({
            ...date,
            leaveTypeId: leave.leaveTypeId,
            userId: +user.id
         }))
      );
      let totalLeaveDays = 0;
      // Create a new updated array
      const updatedLeaveData = body.leaves?.map(leave => {
         const totalValue = leave.dates.reduce((sum, day) => sum + day.value, 0);
         totalLeaveDays += totalValue;
         return { ...leave, totalValue };
      });

      const transaction = await prisma.$transaction(async (prisma) => {
         // Create the leave application
         const createLeave = await prisma.leaveApplication.create({
            data: {
               userId: +user.id,
               subject: body.subject,
               reason: body.reason,
               leaveApplicationDetails: {
                  create: updatedLeaveData?.map(leave => ({
                     leaveType: { connect: { id: leave.leaveTypeId } },
                     leaveCount: leave.totalValue,
                     leaveDates: leave
                  }))
               }
            }
         });

         // Create leaveApplicationCalender entries linked to the leave application
         const createCalender = await prisma.leaveApplicationCalender.createMany({
            data: transformedLeaves?.map(leave => ({
               applicationId: createLeave.id,
               leaveTypeId: leave.leaveTypeId,
               userId: leave.userId,
               leaveDate: leave.date,
               leaveMode: leave.type
            }))
         });

         await Promise.all(
            updatedLeaveData?.map(leave =>
               prisma.userLeave.update({
                  where: {
                     userId_leaveTypeId: {
                        userId: +user.id,
                        leaveTypeId: +leave.leaveTypeId
                     }
                  },
                  data: {
                     pendingLeaves: {
                        increment: parseInt(leave.totalValue)
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
         },
         orderBy: {
            createdAt: 'desc',
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
            // leaveApplicationDetails: {
            //    include: {
            //       leaveType: {
            //          select: {
            //             name: true,
            //             code: true
            //          }
            //       }
            //    }
            // },
            leaveApplicationCalender: {
               include: {
                  leaveType: {
                     select: {
                        name: true,
                        code: true
                     }
                  }
               }
            }
         }
      })
      res.status(200).json({ success: true, application })
   } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: 'Error retrieving application', error })
   }
})

// WFH Application

userLeaveRouter.post("/create-wfh", async (req, res) => {
   try {
      const user = req.user
      const body = req.body

      const findWfh = await prisma.leaveType.findUnique({
         where: { code: 'WFH' },
         select: { id: true }
      })
      if (!findWfh) return res.status(409).json({ success: false, message: 'No WFH leave type found' })

      const checkWfhAbility = await prisma.userLeave.findUnique({
         where: {
            userId_leaveTypeId: {
               userId: +user.id,
               leaveTypeId: +findWfh.id
            }
         }
      })
      if (!checkWfhAbility) return res.status(409).json({ success: false, message: 'User does not have WFH leave' })

      // const transformedLeaves = body.wfhDates.flatMap();

      const transaction = await prisma.$transaction(async (prisma) => {
         // Create the leave application
         const createWfh = await prisma.WorkFormHomeApplication.create({
            data: {
               userId: +user.id,
               subject: body.subject,
               reason: body.reason,
               wfhDetails: {
                  wfhCount: body.wfhCount,
                  wfhDates: body.wfhDates,
               }
            }
         });

         // Create leaveApplicationCalender entries linked to the leave application
         const createCalender = await prisma.WfhApplicationCalender.createMany({
            data: body?.wfhDates?.map(leaveDate => ({
               applicationId: createWfh.id,
               leaveTypeId: +findWfh.id,
               userId: +user.id,
               leaveDate: leaveDate
            }))
         });

         // update wfh details
         const updateWfhCount = await prisma.userLeave.update({
            where: {
               userId_leaveTypeId: {
                  userId: +user.id,
                  leaveTypeId: +findWfh.id
               }
            },
            data: {
               pendingLeaves: {
                  increment: parseInt(body?.wfhCount)
               }
            }
         })

         return { createWfh, createCalender }
      });

      if (transaction.createWfh) {
         var mailOptions = {
            from: {
               name: 'WFH Application',
               address: 'leave.reply@girlpowertalk.com'
            },
            to: [user?.email, 'leave@girlpowertalk.com'],
            subject: body?.subject,
            html: body?.reason
         };
         transporter.sendMail(mailOptions);
      }

      return res.status(201).json({ success: true, message: 'WFH was successfully created' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})
userLeaveRouter.get("/month-wfh-list", async (req, res) => {
   try {
      const query = req.query
      const year = new Date(query?.minDate).getFullYear()
      const month = new Date(query?.minDate).getMonth() + 1;

      const startDate = new Date(year, month - 1, 1); // First day of the month
      const endDate = new Date(year, month, 1); // First day of the next month

      const wfhApplications = await prisma.wfhApplicationCalender.findMany({
         where: {
            leaveDate: {
               gte: startDate, // Greater than or equal to the first day of the month
               lt: endDate,    // Less than the first day of the next month
            },
         },
         include: {
            user: {
               select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  department: true
               }
            }
         },
         orderBy: {
            leaveDate: "asc",
         },
      });

      // Group data manually by date
      const groupedData = wfhApplications?.reduce((acc, record) => {
         const dateKey = record.leaveDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
         if (!acc[dateKey]) {
            acc[dateKey] = [];
         }
         acc[dateKey].push({
            applicationId: record.applicationId,
            userId: record.user.id,
            userName: record.user.firstName + ' ' + record.user.lastName,
            userDepartment: record.user.department,
            status: record.status
         });
         return acc;
      }, {});

      return res.status(200).json({ success: true, groupedData })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error retrieving WFH applications', error })
   }
})


export default userLeaveRouter

