import { Router } from 'express'
import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';

const transporter = nodemailer.createTransport({
   service: "Gmail",
   auth: {
      user: process.env.CENTRAL_EMAIL_ADDRESS,
      pass: process.env.CENTRAL_EMAIL_PASSWORD,
   },
});

const adminLeaveRouter = Router();
adminLeaveRouter.use(adminAuthentication())

adminLeaveRouter.get("/applications", async (req, res) => {
   try {
      const applications = await prisma.leaveApplication.findMany({
         include: {
            user: true,
            leaveApplicationDetails: {
               include: {
                  leaveType: true
               }
            }
         },
         orderBy: {
            createdAt: "desc"
         }
      })
      return res.status(200).json({ success: true, applications })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "Failed to get leave applications" })
   }
})
adminLeaveRouter.get("/read-application/:id", async (req, res) => {
   try {
      const application = await prisma.leaveApplication.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            user: {
               select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  userLeave: {
                     include: {
                        leaveType: {
                           select: {
                              name: true
                           }
                        }
                     }
                  }
               }
            },
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
      return res.status(200).json({ success: true, application })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "Failed to get leave applications" })
   }
})
adminLeaveRouter.put("/update-application/:id", async (req, res) => {
   try {
      const applicatioId = req.params.id
      const body = req.body
      const applicationDetails = await prisma.leaveApplication.findUnique({
         where: { id: +applicatioId },
         include: {
            user: {
               select: { email: true }
            },
            leaveApplicationDetails: {
               select: { leaveTypeId: true, leaveCount: true }
            }
         }
      })
      if (!applicationDetails) {
         return res.status(409).json({ success: false, message: 'Application not found' })
      }
      if (!applicationDetails?.status === 'pending') {
         return res.status(409).json({ success: false, message: 'Application already processed' })
      }
      if (!body?.status) {
         return res.status(409).json({ success: false, message: 'Application status not found' })
      }

      const transformedLeaves = body.leaves.reduce((acc, leave) => {
         const addOrMergeLeave = (leaveTypeId, leaveCount) => {
            if (leaveTypeId !== null) {
               const existingLeave = acc.find(l => l.leaveTypeId === leaveTypeId);
               if (existingLeave) {
                  existingLeave.leaveCount += leaveCount;
               } else {
                  acc.push({ leaveTypeId, leaveCount });
               }
            }
         };

         addOrMergeLeave(leave.leaveTypeId, leave.leaveCount);
         addOrMergeLeave(leave.modifyLeaveTypeId, leave.modifyLeaveCount);

         return acc;
      }, []);

      if (body.status === 'approved') {
         const transaction = await prisma.$transaction(async (prisma) => {
            // update status
            const updateLeave = await prisma.leaveApplication.update({
               where: { id: +applicatioId },
               data: {
                  status: body.status
               }
            })
            // update application calender
            const updateCalender = await prisma.LeaveApplicationCalender.updateMany({
               where: {
                  applicationId: +applicatioId
               },
               data: {
                  status: body.status
               }
            })
            //  upadte leave count
            await Promise.all([
               // Only run if transformedLeaves has data
               ...(transformedLeaves?.length ? transformedLeaves.map(leave =>
                  prisma.userLeave.update({
                     where: {
                        userId_leaveTypeId: {
                           userId: +applicationDetails?.userId,
                           leaveTypeId: +leave.leaveTypeId
                        }
                     },
                     data: {
                        totalLeaves: {
                           decrement: parseInt(leave.leaveCount)
                        }
                     }
                  })
               ) : []),

               // Only run if applicationDetails.userLeave has data
               ...(applicationDetails?.leaveApplicationDetails?.length ? applicationDetails.leaveApplicationDetails.map(leave =>
                  prisma.userLeave.update({
                     where: {
                        userId_leaveTypeId: {
                           userId: +applicationDetails?.userId,
                           leaveTypeId: +leave.leaveTypeId
                        }
                     },
                     data: {
                        pendingLeaves: {
                           decrement: parseInt(leave.leaveCount)
                        }
                     }
                  })
               ) : [])
            ]);
            return { updateLeave, updateCalender }
         })
         if (transaction.updateLeave) {
            var mailOptions = {
               from: {
                  name: 'Leave Application',
                  address: 'leave.reply@girlpowertalk.com'
               },
               to: [applicationDetails?.user?.email, 'leave@girlpowertalk.com'],
               subject: body?.subject,
               html: '<p>Approved leave</p>'
            };
            transporter.sendMail(mailOptions);
         }
      }
      if (body.status === 'rejected') {
         const transaction = await prisma.$transaction(async (prisma) => {
            // update status
            const updateLeave = await prisma.leaveApplication.update({
               where: { id: +applicatioId },
               data: {
                  status: body.status
               }
            })
            // update application calender
            const updateCalender = await prisma.LeaveApplicationCalender.updateMany({
               where: {
                  applicationId: +applicatioId
               },
               data: {
                  status: body.status
               }
            })
            // update pending leaves
            await Promise.all(
               // Only run if applicationDetails.userLeave has data
               ...(applicationDetails?.leaveApplicationDetails?.length ? applicationDetails.leaveApplicationDetails.map(leave =>
                  prisma.userLeave.update({
                     where: {
                        userId_leaveTypeId: {
                           userId: +applicationDetails?.userId,
                           leaveTypeId: +leave.leaveTypeId
                        }
                     },
                     data: {
                        pendingLeaves: {
                           decrement: parseInt(leave.leaveCount)
                        }
                     }
                  })
               ) : [])
            );
            return { updateLeave, updateCalender }
         })
         if (transaction.updateLeave) {
            var mailOptions = {
               from: {
                  name: 'Leave Application',
                  address: 'leave.reply@girlpowertalk.com'
               },
               to: [applicationDetails?.user?.email, 'leave@girlpowertalk.com'],
               subject: body?.subject,
               html: '<p>Rejected leave</p>'
            };
            transporter.sendMail(mailOptions);
         }
      }
      return res.status(200).json({ success: false, message: 'Nothing changes, server error' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})
export default adminLeaveRouter