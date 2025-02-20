import { Router } from 'express'
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';
const leaveTypeRouter = Router();

leaveTypeRouter.use(adminAuthentication())
leaveTypeRouter.post("/create-type", async (req, res) => {
   try {
      const body = req.body
      const checkName = await prisma.leaveType.findUnique({
         where: { name: body.name }
      })
      if (checkName) {
         return res.status(409).json({ success: false, message: 'Type name already exists' })
      }
      const createType = await prisma.leaveType.create({
         data: body
      })
      if (!createType) {
         return res.status(409).json({ success: false, message: 'Error creating type' })
      }
      return res.status(200).json({ success: true, message: 'Successfully created type' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Something went wrong', error })
   }
})
leaveTypeRouter.put("/update-type/:id", async (req, res) => {
   try {
      const body = req.body
      const id = parseInt(req.params.id)
      const checkName = await prisma.leaveType.findUnique({
         where: {
            name: body.name,
            NOT: { id: id }
         }
      })
      if (checkName) {
         return res.status(409).json({ success: false, message: 'Type name already exists' })
      }
      const updateType = await prisma.leaveType.update({
         where: { id: parseInt(req.params.id) },
         data: body
      })
      if (!updateType) {
         return res.status(404).json({ success: false, message: 'Type not found' })
      }
      return res.status(200).json({ success: true, message: 'Type updated successfully' })
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Error while updating', error })

   }
})
leaveTypeRouter.delete("/delete-type/:id", async (req, res) => {
   try {
      const deleteType = await prisma.leaveType.delete({
         where: { id: parseInt(req.params.id) }
      })
      if (!deleteType) {
         return res.status(404).json({ success: false, message: 'Type not found' })
      }
      return res.status(200).json({ success: true, message: 'Type delete successfully' })
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Error while updating', error })

   }
})
leaveTypeRouter.get("/read-type/:id", async (req, res) => {
   try {
      const type = await prisma.leaveType.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            leaveRelationship: {
               include: {
                  format: true
               }
            }
         }
      })
      if (!type) {
         return res.status(404).json({ success: false, message: 'Type not found' })
      }
      return res.status(200).json({ success: true, message: 'Type retrieved successfully', type })
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Error while retrieving', error })
   }
})
leaveTypeRouter.delete("/delete-types", async (req, res) => {
   try {
      const { ids } = req.body
      const types = await prisma.leaveType.deleteMany({
         where: {
            id: {
               in: ids
            }
         }
      })
      return res.status(200).json({ success: true, message: 'All employees deleted successfully', count: types.count })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }

})
leaveTypeRouter.get("/all-types", async (req, res) => {
   try {
      const { search, column = 'createdAt', sortOrder = 'desc', page = 1, limit = 15 } = req.query
      const conditions = {}
      if (search) {
         conditions.name = { contains: search, mode: "insensitive" }
      }
      const query = {};
      if (column && sortOrder) {
         query.orderBy = { [column]: sortOrder }
      }

      const types = await prisma.leaveType.findMany({
         where: conditions,
         take: +limit,
         skip: (+page - 1) * +limit,
         ...query
      })
      const total = await prisma.leaveType.count({ where: conditions })
      return res.status(200).json({ success: true, message: 'All types retrieved successfully', types, total })
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Something went wrong', error })
   }
})
leaveTypeRouter.get("/type-list", async (req, res) => {
   try {
      const types = await prisma.leaveType.findMany()
      return res.status(200).json({ success: true, message: 'Type list retrieved successfully', types })
   } catch (error) {
      return res.status(500).json({ success: false, message: 'Error retrieving type list', error })
   }
})

export default leaveTypeRouter