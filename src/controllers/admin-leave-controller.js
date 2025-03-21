import { Router } from 'express'
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';
import { updateAdminLeaveApplicationValidation } from '../validations/admin-leave.js';
import { ApprovedTemplateForEmployee, RejectedTemplateForEmployee } from '../lib/mail-template.js';


const adminLeaveRouter = Router();
adminLeaveRouter.use(adminAuthentication())

adminLeaveRouter.get("/applications", async (req, res) => {
   try {
      const { search, column = 'createdAt', status = "all", sortOrder = 'desc', page = 1, limit = 15 } = req.query
      const conditions = {}
      if (search) {
         conditions.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
         ]
      }
      if (status !== 'all') {
         conditions.status = status
      }
      const query = {};
      if (column && sortOrder) {
         query.orderBy = { [column]: sortOrder }
      }
      const applications = await prisma.leaveApplication.findMany({
         where: conditions,
         include: {
            user: true,
            leaveApplicationDetails: {
               include: {
                  leaveType: true
               }
            }
         },
         take: +limit,
         skip: (+page - 1) * +limit,
         ...query
      })
      const total = await prisma.leaveApplication.count({
         where: conditions
      })
      const groupedByStatus = await prisma.leaveApplication.groupBy({
         by: ['status'],
         _count: {
            _all: true,
         },
      })
      return res.status(200).json({ success: true, applications, total, groupedByStatus })
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
                              id: true,
                              name: true,
                              code: true
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
                        id: true,
                        name: true,
                        code: true
                     }
                  }
               }
            },
         }
      })

      // function getLeaveDateRange(leaveApplicationDetails) {
      //    // Extract all leave dates
      //    let allLeaveDates = leaveApplicationDetails.flatMap(detail => detail.leaveDates);
      //    // Convert to Date objects and sort them
      //    allLeaveDates = allLeaveDates.map(date => new Date(date)).sort((a, b) => a - b);

      //    return {
      //       firstLeaveDate: allLeaveDates[0]?.toISOString().split('T')[0], // Format: YYYY-MM-DD
      //       lastLeaveDate: allLeaveDates[allLeaveDates.length - 1]?.toISOString().split('T')[0]
      //    };
      // }
      // const dd = getLeaveDateRange(application?.leaveApplicationDetails)

      // const anotherApplications = await prisma.leaveApplicationCalender.findMany({
      //    where: {
      //       leaveDate: {
      //          gte: new Date(dd.firstLeaveDate), // Greater than or equal to firstLeaveDate
      //          lte: new Date(dd.lastLeaveDate)   // Less than or equal to lastLeaveDate
      //       }
      //    },
      //    include: {
      //       user: {
      //          select: {
      //             id: true,
      //             firstName: true,
      //             lastName: true,
      //             department: true
      //          }
      //       },           // Include user details
      //       leaveType: {
      //          select: {
      //             id: true,
      //             name: true
      //          }
      //       },      // Include leave type details
      //    }
      // });

      // // Group data manually by date
      // const groupedData = anotherApplications.reduce((acc, record) => {
      //    const dateKey = record.leaveDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
      //    if (!acc[dateKey]) {
      //       acc[dateKey] = [];
      //    }
      //    acc[dateKey].push({
      //       applicationId: record.applicationId,
      //       userId: record.user.id,
      //       userName: record.user.firstName + ' ' + record.user.lastName,
      //       userDepartment: record.user.department,
      //       leaveType: record.leaveType.name,
      //       status: record.status
      //    });
      //    return acc;
      // }, {});

      return res.status(200).json({ success: true, application })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ message: "Failed to get leave applications" })
   }
})
adminLeaveRouter.get("/application-details/:id", async (req, res) => {
   try {
      const application = await prisma.leaveApplication.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
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
adminLeaveRouter.put("/update-application/:id", async (req, res) => {
   try {
      const validation = updateAdminLeaveApplicationValidation.safeParse(req.body);
      if (!validation.success) {
         return res.status(400).json({
            status: "error",
            errors: validation.error.flatten().fieldErrors,
         });
      }
      // return res.status(200).json({ success: true, message: 'upadte', body: req.body })
      const applicationId = req.params.id
      const body = req.body
      const applicationDetails = await prisma.leaveApplication.findUnique({
         where: { id: +applicationId },
         include: {
            user: {
               select: {
                  firstName: true,
                  lastName: true,
                  email: true,
               }
            },
            leaveApplicationDetails: {
               include: {
                  leaveType: {
                     select: {
                        id: true,
                        name: true,
                        code: true
                     }
                  }
               }
            }
         }
      })
      if (!applicationDetails) {
         return res.status(409).json({ success: false, message: 'Application not found' })
      }
      if (!applicationDetails?.status === 'pending') {
         return res.status(409).json({ success: false, message: 'Application already processed' })
      }
      const allLeaveList = body?.leaveApplicationDetails?.flatMap(app =>
         app.leaveDates.dates.map(date => ({
            ...date,
            applicationId: app.applicationId
         }))
      );
      // const approvalRejectionCounts = body?.leaveApplicationDetails?.map(application => {
      //    const { dates, totalValue, leaveTypeId } = application.leaveDates;

      //    // Calculate approved and rejected values
      //    const approvedValue = dates
      //       .filter(date => date.status === "approved")
      //       .reduce((sum, date) => sum + date.value, 0);

      //    const rejectedValue = dates
      //       .filter(date => date.status === "rejected")
      //       .reduce((sum, date) => sum + date.value, 0);

      //    return {
      //       ...application,
      //       leaveDates: {
      //          ...application.leaveDates,
      //          totalValue,
      //          approvedValue,
      //          rejectedValue,
      //          leaveTypeId,
      //       }
      //    };
      // });
      const approvalRejectionCounts = body?.leaveApplicationDetails?.map(application => {
         const { dates, totalValue } = application.leaveDates;
         // Calculate approved values
         const approvedValue = dates
            .filter(date => date.status === "approved")
            .reduce((sum, date) => sum + date.value, 0);
         // Calculate rejected values
         const rejectedValue = dates
            .filter(date => date.status === "rejected")
            .reduce((sum, date) => sum + date.value, 0);

         return {
            leaveType: application?.leaveType,
            approvedValue,
            rejectedValue,
            totalValue
         }
      });
      body?.modify.forEach(mod => {
         const { modifyDays, modifyLeaveType, leaveType, leaveDays } = mod;

         // Step 1: Reduce approvedValue from existing leaveType
         const existingLeave = approvalRejectionCounts.find(item => item.leaveType.id === leaveType.id);
         if (existingLeave) {
            existingLeave.approvedValue = Math.max(existingLeave.approvedValue - leaveDays, 0);
            existingLeave.totalValue = existingLeave.approvedValue + existingLeave.rejectedValue;
         }

         // Step 2: Add or update modifyLeaveType
         const modifyExisting = approvalRejectionCounts.find(item => item.leaveType.id === modifyLeaveType.id);
         if (modifyExisting) {
            modifyExisting.approvedValue += modifyDays;
            modifyExisting.totalValue = modifyExisting.approvedValue + modifyExisting.rejectedValue;
         } else {
            approvalRejectionCounts.push({
               leaveType: modifyLeaveType,
               approvedValue: modifyDays,
               rejectedValue: 0,
               totalValue: 0
            });
         }
      });

      if (body?.approved) {
         const transaction = await prisma.$transaction(async (prisma) => {
            // update status
            const upadteStatus = await prisma.leaveApplication.update({
               where: { id: +applicationId },
               data: {
                  comment: body?.hrComment,
                  status: 'approved'
               }
            })
            //  upadte leave count
            await Promise.all([
               // Only run if transformedLeaves has data
               ...(allLeaveList?.length ? allLeaveList.map(leave =>
                  prisma.LeaveApplicationCalender.update({
                     where: {
                        applicationId_leaveDate: {
                           applicationId: +leave?.applicationId,
                           leaveDate: leave.date
                        }
                     },
                     data: {
                        status: leave?.status
                     }
                  })
               ) : []),

               // Only run if applicationDetails.userLeave has data
               ...(approvalRejectionCounts?.length ? approvalRejectionCounts?.map(leave =>
                  prisma.userLeave.update({
                     where: {
                        userId_leaveTypeId: {
                           userId: +applicationDetails?.userId,
                           leaveTypeId: +leave.leaveType.id
                        }
                     },
                     data: {
                        pendingLeaves: {
                           decrement: (Number(leave?.approvedValue) || 0) + (Number(leave?.rejectedValue) || 0)
                        },
                        totalLeaves: {
                           decrement: Number(leave?.approvedValue)
                        }
                     }
                  })
               ) : [])
            ]);
            return { upadteStatus }
         })
         if (transaction.upadteStatus) {
            ApprovedTemplateForEmployee({
               applicationId,
               employeeEmail: applicationDetails?.user?.email,
               employeeName: applicationDetails?.user?.firstName + ' ' + applicationDetails?.user?.lastName,
               subject: applicationDetails?.subject,
               reason: applicationDetails?.reason,
               leaves: applicationDetails?.leaveApplicationDetails
            })
         }
      } else {
         const transaction = await prisma.$transaction(async (prisma) => {
            // update status
            const upadteStatus = await prisma.leaveApplication.update({
               where: { id: +applicationId },
               data: {
                  comment: body?.hrComment,
                  status: 'rejected'
               }
            })
            //  upadte leave count
            await Promise.all([
               // Only run if transformedLeaves has data
               ...(allLeaveList?.length ? allLeaveList.map(leave =>
                  prisma.LeaveApplicationCalender.update({
                     where: {
                        applicationId_leaveDate: {
                           applicationId: +leave?.applicationId,
                           leaveDate: leave.date
                        }
                     },
                     data: {
                        status: 'rejected'
                     }
                  })
               ) : []),

               // Only run if applicationDetails.userLeave has data
               ...(approvalRejectionCounts?.length ? approvalRejectionCounts?.map(leave =>
                  prisma.userLeave.update({
                     where: {
                        userId_leaveTypeId: {
                           userId: +applicationDetails?.userId,
                           leaveTypeId: +leave.leaveType.id
                        }
                     },
                     data: {
                        pendingLeaves: {
                           decrement: Number(leave?.totalValue)
                        }
                     }
                  })
               ) : [])
            ]);
            return { upadteStatus }
         })
         if (transaction.upadteStatus) {
            RejectedTemplateForEmployee({
               applicationId,
               employeeEmail: applicationDetails?.user?.email,
               employeeName: applicationDetails?.user?.firstName + ' ' + applicationDetails?.user?.lastName,
               rejectionReason: body?.hrComment,
               leaves: applicationDetails?.leaveApplicationDetails
            })
         }
      }
      return res.status(200).json({ success: true, message: 'upadte' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})

adminLeaveRouter.get("/all-employee-applications", async (req, res) => {
   try {
      const applications = await prisma.users.findMany({
         select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            designation: true,
            // leaveApplication: {
            //    select: {
            //       id: true,
            //       status: true,
            //       leaveApplicationDetails: {
            //          select: { leaveTypeId: true, leaveCount: true }
            //       }
            //    },
            //    orderBy: {
            //       createdAt: 'desc'
            //    }
            // }
            leaveApplicationCalender: {
               select: {
                  leaveDate: true,
                  status: true,
                  leaveType: {
                     select: {
                        id: true,
                        name: true,
                        code: true
                     }
                  }
               },
               orderBy: {
                  leaveDate: 'desc'
               }
            }
         }
      })
      return res.status(200).json({ success: true, message: 'all employee', applications })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Server error', error })
   }
})

export default adminLeaveRouter


// adminLeaveRouter.put("/update-application/:id", async (req, res) => {
//    try {
//       const applicatioId = req.params.id
//       const body = req.body
//       const applicationDetails = await prisma.leaveApplication.findUnique({
//          where: { id: +applicatioId },
//          include: {
//             user: {
//                select: { email: true }
//             },
//             leaveApplicationDetails: {
//                select: { leaveTypeId: true, leaveCount: true }
//             }
//          }
//       })
//       if (!applicationDetails) {
//          return res.status(409).json({ success: false, message: 'Application not found' })
//       }
//       if (!applicationDetails?.status === 'pending') {
//          return res.status(409).json({ success: false, message: 'Application already processed' })
//       }
//       if (!body?.status) {
//          return res.status(409).json({ success: false, message: 'Application status not found' })
//       }

//       const transformedLeaves = body.leaves.reduce((acc, leave) => {
//          const addOrMergeLeave = (leaveTypeId, leaveCount) => {
//             if (leaveTypeId !== null) {
//                const existingLeave = acc.find(l => l.leaveTypeId === leaveTypeId);
//                if (existingLeave) {
//                   existingLeave.leaveCount += leaveCount;
//                } else {
//                   acc.push({ leaveTypeId, leaveCount });
//                }
//             }
//          };

//          addOrMergeLeave(leave.leaveTypeId, leave.leaveCount);
//          addOrMergeLeave(leave.modifyLeaveTypeId, leave.modifyLeaveCount);

//          return acc;
//       }, []);

//       if (body.status === 'approved') {
//          const transaction = await prisma.$transaction(async (prisma) => {
//             // update status
//             const updateLeave = await prisma.leaveApplication.update({
//                where: { id: +applicatioId },
//                data: {
//                   status: body.status
//                }
//             })
//             // update application calender
//             const updateCalender = await prisma.LeaveApplicationCalender.updateMany({
//                where: {
//                   applicationId: +applicatioId
//                },
//                data: {
//                   status: body.status
//                }
//             })
//             //  upadte leave count
//             await Promise.all([
//                // Only run if transformedLeaves has data
//                ...(transformedLeaves?.length ? transformedLeaves.map(leave =>
//                   prisma.userLeave.update({
//                      where: {
//                         userId_leaveTypeId: {
//                            userId: +applicationDetails?.userId,
//                            leaveTypeId: +leave.leaveTypeId
//                         }
//                      },
//                      data: {
//                         totalLeaves: {
//                            decrement: parseInt(leave.leaveCount)
//                         }
//                      }
//                   })
//                ) : []),

//                // Only run if applicationDetails.userLeave has data
//                ...(applicationDetails?.leaveApplicationDetails?.length ? applicationDetails.leaveApplicationDetails.map(leave =>
//                   prisma.userLeave.update({
//                      where: {
//                         userId_leaveTypeId: {
//                            userId: +applicationDetails?.userId,
//                            leaveTypeId: +leave.leaveTypeId
//                         }
//                      },
//                      data: {
//                         pendingLeaves: {
//                            decrement: parseInt(leave.leaveCount)
//                         }
//                      }
//                   })
//                ) : [])
//             ]);
//             return { updateLeave, updateCalender }
//          })
//          if (transaction.updateLeave) {
//             var mailOptions = {
//                from: {
//                   name: 'Leave Application',
//                   address: 'leave.reply@girlpowertalk.com'
//                },
//                to: [applicationDetails?.user?.email, 'leave@girlpowertalk.com'],
//                subject: body?.subject,
//                html: '<p>Approved leave</p>'
//             };
//             transporter.sendMail(mailOptions);
//          }
//       } else {
//          const transaction = await prisma.$transaction(async (prisma) => {
//             // update status
//             const updateLeave = await prisma.leaveApplication.update({
//                where: { id: +applicatioId },
//                data: {
//                   status: body.status
//                }
//             })
//             // update application calender
//             const updateCalender = await prisma.LeaveApplicationCalender.updateMany({
//                where: {
//                   applicationId: +applicatioId
//                },
//                data: {
//                   status: body.status
//                }
//             })
//             // update pending leaves
//             await Promise.all([
//                // Only run if applicationDetails.userLeave has data
//                ...(applicationDetails?.leaveApplicationDetails?.length ? applicationDetails.leaveApplicationDetails.map(leave =>
//                   prisma.userLeave.update({
//                      where: {
//                         userId_leaveTypeId: {
//                            userId: +applicationDetails?.userId,
//                            leaveTypeId: +leave.leaveTypeId
//                         }
//                      },
//                      data: {
//                         pendingLeaves: {
//                            decrement: parseInt(leave.leaveCount)
//                         }
//                      }
//                   })
//                ) : [])
//             ]);
//             return { updateLeave, updateCalender }
//          })
//          if (transaction.updateLeave) {
//             var mailOptions = {
//                from: {
//                   name: 'Leave Application',
//                   address: 'leave.reply@girlpowertalk.com'
//                },
//                to: [applicationDetails?.user?.email, 'leave@girlpowertalk.com'],
//                subject: body?.subject,
//                html: '<p>Rejected leave</p>'
//             };
//             transporter.sendMail(mailOptions);
//          }
//       }
//       return res.status(200).json({ success: false, message: 'Nothing changes, server error' })
//    } catch (error) {
//       console.log(error)
//       return res.status(500).json({ success: false, message: 'Server error', error })
//    }
// })

// const newApprovalRejectionCounts = [
//    {
//       "leaveType": {
//          "id": 1,
//          "name": "Earned Leaves",
//          "code": "EL"
//       },
//       "approvedValue": 4,
//       "rejectedValue": 0,
//       "totalValue": 4
//    },
//    {
//       "leaveType": {
//          "id": 5,
//          "name": "Work From Home",
//          "code": "WFH"
//       },
//       "approvedValue": 4,
//       "rejectedValue": 0,
//       "totalValue": 4
//    },
//    {
//       "leaveType": {
//          "id": 4,
//          "name": "Festive Leave",
//          "code": "FL"
//       },
//       "approvedValue": 3,
//       "rejectedValue": 0,
//       "totalValue": 3
//    }
// ]
// const modification = [
//    {
//       "modifyDays": 1,
//       "modifyLeaveType": {
//          "id": 2,
//          "name": "Casual Leave",
//          "code": "CL"
//       },
//       "leaveType": {
//          "id": 5,
//          "name": "Work From Home",
//          "code": "WFH"
//       },
//       "leaveDays": 2
//    }
// ]

// first check newApprovalRejectionCounts array item is existing on modification. if existing update approvedValue like approvedValue minus leaveDays.
// after check modifyLeaveType is esixting on newApprovalRejectionCounts update approvedValue like approvedValue plus modifyDays, if not existing modifyLeaveType added new item on newApprovalRejectionCounts like
// {
//    "leaveType": {
//       "id": 4,
//       "name": "Festive Leave",
//       "code": "FL"
//    },
//    "approvedValue": 3,
//    "rejectedValue": 0,
//    "totalValue": 3
// }
// approvedValue is modifyDays, rejectedValue value is zero and totalValue is modifyDays