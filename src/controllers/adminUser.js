
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
         where: {
            email: body.email,
         }
      })
      if (checkEmail) {
         return res.status(409).json({ success: false, message: 'Email already exists' })
      }
      //
      const specificDate = new Date(body?.joiningDate);
      const month = specificDate.getMonth() + 1;
      // Use integer division to calculate the quarter
      const quarter = Math.ceil(month / 3);
      // get all leave types
      var leavesList = []
      if (body.type) {
         const leaveTypes = await prisma.leaveFormat.findUnique({
            where: { id: +body.type },
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
               if (quarter === 1) {
                  value = item.quarterOne;  // Should be quarterOne for Q1
               } else if (quarter === 2) {
                  value = item.quarterTwo;  // Should be quarterTwo for Q2
               } else if (quarter === 3) {
                  value = item.quarterThree;  // Should be quarterThree for Q3
               } else if (quarter === 4) {
                  value = item.quarterFour;  // Should be quarterFour for Q4
               }
            } else {
               value = item.quarterOne;
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
            status: body.status,
            gender: body.gender,
            formatId: body.type,
            joiningData: body.joiningData,
            userLeave: {
               create: leavesList.map((item) => ({
                  leaveType: { connect: { id: item?.id } },
                  totalLeaves: item.value
               })),
            }
         }
      })
      if (!createEmployee) return res.status(409).json({ success: false, message: 'Error creating employee' })
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
         data: body
      })
      if (!employee) {
         return res.status(409).json({ success: false, message: 'Employee not found' })
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

export default adminUserRouter
