
import { Router } from 'express'
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';
const adminUserRouter = Router();

// adminUserRouter.use(adminAuthentication())
adminUserRouter.post('/create-employee', async (req, res) => {
   try {
      const body = req.body
      console.log(body)
      const checkEmail = await prisma.users.findUnique({
         where: { email: body.email }
      })
      if (checkEmail) return res.status(409).json({ success: false, message: 'Email already exists' })
      // get the employee join month
      const joinMonth = new Date(body?.joiningDate).getMonth() + 1;
      // get all leave types
      var leavesList = []
      if (body.formatId) {
         const leaveTypes = await prisma.leaveFormat.findUnique({
            where: { id: +body.formatId },
            select: {
               leaveRelationship: {
                  include: {
                     type: {
                        select: {
                           id: true,
                           frequency: true
                        }
                     }
                  }
               }
            }
         })
         // Extract Leaves from format
         leavesList = leaveTypes?.leaveRelationship?.map(item => {
            let value = 0;
            const frequency = item.type.frequency
            if (frequency === 'yearly') {
               if (joinMonth >= 4 && joinMonth <= 6) {
                  value = item.quarterOne;
               } else if (joinMonth >= 7 && joinMonth <= 9) {
                  value = item.quarterTwo;
               } else if (joinMonth >= 10 && joinMonth <= 12) {
                  value = item.quarterThree;
               } else {
                  value = item.quarterFour;
               }
            } else {
               value = item.leaveGiven;
            }
            return { ...item.type, value };
         });
      }
      const createEmployee = await prisma.users.create({
         data: {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            role: body.role,
            employeeType: body.employeeType,
            reportingHrId: body.reportingHrId || null,
            formatId: body.formatId || null,
            ...(Array.isArray(leavesList) && leavesList.length > 0 && {
               userLeave: {
                  create: leavesList.map((item) => ({
                     leaveType: { connect: { id: item?.id } },
                     totalLeaves: item.value,
                  })),
               },
            }),
            ...(body.meta && typeof body.meta === "object" && Object.keys(body.meta).length > 0 && {
               userMeta: {
                  create: Object.entries(body.meta).map(([key, value]) => ({
                     key,
                     value: value
                  })),
               },
            }),
         },
      });


      if (!createEmployee) return res.status(409).json({ success: false, message: 'Error creating employee' })
      console.log('new employee =>', createEmployee)
      return res.status(200).json({ success: true, message: 'Employee create successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.put("/update-employee/:id", async (req, res) => {
   try {
      const body = req.body
      console.log(body)
      const { formatId, ...rest } = req.body
      const checkEmail = await prisma.users.findUnique({
         where: {
            email: rest.email,
            NOT: { id: parseInt(req.params.id) }
         }
      })
      if (checkEmail) return res.status(409).json({ success: false, message: "Email already exists" })
      const employee = await prisma.users.update({
         where: { id: parseInt(req.params.id) },
         data: {
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            role: body.role,
            employeeType: body.employeeType,
            reportingHrId: body.reportingHrId || null,
            formatId: body.formatId || null,
            ...(body.meta && typeof body.meta === "object" && Object.keys(body.meta).length > 0 && {
               userMeta: {
                  upsert: Object.entries(body.meta).map(([key, value]) => ({
                     where: {
                        userId_key: {
                           userId: +userId,
                           key: key
                        }
                     },
                     create: {
                        key,
                        value: value,
                     },
                     update: {
                        value: value,
                     }
                  }))
               }
            })
         }
      })
      if (!employee) {
         return res.status(409).json({ success: false, message: 'Employee not update' })
      }
      return res.status(200).json({ success: true, message: 'Employee updated successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.put("/update-leaves/:id", async (req, res) => {
   try {
      const { leaves } = req.body
      const employee = await prisma.users.update({
         where: { id: parseInt(req.params.id) },
         data: {
            userLeave: {
               upsert: leaves.map((leave) => ({
                  where: {
                     userId_leaveTypeId: {
                        userId: parseInt(req.params.id),
                        leaveTypeId: leave.leaveTypeId
                     }
                  },
                  create: {
                     leaveType: { connect: { id: leave.leaveTypeId } },
                     totalLeaves: leave.totalLeaves
                  },
                  update: {
                     totalLeaves: leave.totalLeaves
                  }
               }))
            }
         }
      })
      if (!employee) {
         return res.status(404).json({ success: false, message: 'Employee not found' })
      }
      return res.status(200).json({ success: true, message: 'Leaves updated successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.get("/read-employee/:id", async (req, res) => {
   try {
      const employee = await prisma.users.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            userLeave: {
               include: {
                  leaveType: true
               }
            },
            userMeta: true
         }
      })
      if (!employee) {
         return res.status(404).json({ success: false, message: 'Employee not found' })
      }
      return res.status(200).json({ success: true, employee })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.delete("/delete-employee/:id", async (req, res) => {
   try {
      const employee = await prisma.users.delete({
         where: { id: parseInt(req.params.id) }
      })
      if (!employee) {
         return res.status(404).json({ success: false, message: 'Employee not found' })
      }
      return res.status(200).json({ success: true, message: 'Employee deleted successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.delete("/delete-employee", async (req, res) => {
   try {
      const { ids } = req.body

      const employees = await prisma.users.deleteMany({
         where: {
            id: {
               in: ids
            }
         }
      })
      return res.status(200).json({ success: true, message: 'All employees deleted successfully', count: employees.count })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }

})
adminUserRouter.get('/all-employees', async (req, res) => {
   try {
      const { search, column = 'createdAt', sortOrder = 'desc', page = 1, limit = 15 } = req.query
      const conditions = {}
      if (search) {
         conditions.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
         ]
      }
      const query = {};
      if (column && sortOrder) {
         query.orderBy = { [column]: sortOrder }
      }
      const employees = await prisma.users.findMany({
         where: conditions,
         take: +limit,
         skip: (+page - 1) * +limit,
         ...query
      })
      const total = await prisma.users.count({ where: conditions })
      return res.status(200).json({ success: true, employees, total })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
adminUserRouter.get("/hr-list", async (req, res) => {
   try {
      const hrList = await prisma.users.findMany({
         where: { NOT: { role: "employee" } },
         select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
         }
      })
      return res.json({ success: true, hrList })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})

export default adminUserRouter
