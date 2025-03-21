import { Router } from 'express'
import prisma from '../../config/prisma.js';
import { adminAuthentication } from '../../middleware/index.js';
import { createDepartmentSchema } from '../../validations/department-validation.js';
import { z } from "zod";

const adminDepartmentRouter = Router();
adminDepartmentRouter.use(adminAuthentication())

adminDepartmentRouter.post("/create-department", async (req, res) => {
   try {
      // Validate incoming request
      const validatedData = createDepartmentSchema.parse({
         ...req.body,
         parentId: req.body.parentId ? Number(req.body.parentId) : null,
         leaderId: req.body.leaderId ? Number(req.body.leaderId) : null,
      });
      const checkDepartmentName = await prisma.department.findUnique({
         where: { name: validatedData?.name }
      })
      if (checkDepartmentName) return res.status(409).json({ success: false, message: 'Department name already exists' })
      const checkDepartmentCode = await prisma.department.findUnique({
         where: { code: validatedData?.code }
      })
      if (checkDepartmentCode) return res.status(409).json({ success: false, message: 'Department code already exists' })
      const department = await prisma.department.create({
         data: validatedData
      })
      return res.status(201).json({ success: true, message: 'Department created successfully', department })
   } catch (error) {
      console.error(error)
      if (error instanceof z.ZodError) {
         return res.status(409).json({ errors: error.flatten().fieldErrors, });
      }
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDepartmentRouter.put("/update-department/:id", async (req, res) => {
   try {
      const departmentId = parseInt(req.params.id)
      // Validate incoming request
      const validatedData = createDepartmentSchema.parse({
         ...req.body,
         parentId: req.body.parentId ? Number(req.body.parentId) : null,
         leaderId: req.body.leaderId ? Number(req.body.leaderId) : null,
      });
      const checkDepartmentName = await prisma.department.findUnique({
         where: {
            name: validatedData?.name,
            NOT: { id: departmentId }
         }
      })
      if (checkDepartmentName) return res.status(409).json({ success: false, message: 'Department name already exists' })
      const checkDepartmentCode = await prisma.department.findUnique({
         where: {
            code: validatedData?.code,
            NOT: { id: departmentId }
         }
      })
      if (checkDepartmentCode) return res.status(409).json({ success: false, message: 'Department code already exists' })
      const updatedDepartment = await prisma.department.update({
         where: { id: departmentId },
         data: validatedData
      })
      if (!updatedDepartment) return res.status(404).json({ success: false, message: 'Department not found' })
      return res.status(200).json({ success: true, message: 'Department updated successfully', updatedDepartment })
   } catch (error) {
      console.error(error)
      if (error instanceof z.ZodError) {
         return res.status(409).json({ errors: error.flatten().fieldErrors, });
      }
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDepartmentRouter.get("/read-department/:id", async (req, res) => {
   try {
      const department = await prisma.department.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            leader: {
               select: {
                  id: true,
                  firstName: true,
                  lastName: true
               }
            },
            parent: {
               select: {
                  id: true,
                  name: true
               }
            },
         }
      })
      return res.status(200).json({ success: true, message: 'Department retrieved successfully', department })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDepartmentRouter.get("/departments", async (req, res) => {
   try {
      const { page = 1, limit = 15, orderBy = 'desc', orderColumn = 'createdAt', search = '' } = req.query
      const conditions = {}
      if (search) {
         conditions.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } }
         ]
      }
      const queries = {}
      if (page && limit) {
         queries.skip = (parseInt(page) - 1) * parseInt(limit);
         queries.take = parseInt(limit);
      }
      if (orderBy && orderColumn) {
         queries.orderBy = { [orderColumn]: orderBy }
      }
      const departments = await prisma.department.findMany({
         where: conditions,
         ...queries,
         include: {
            leader: {
               select: {
                  id: true,
                  firstName: true,
                  lastName: true
               }
            },
            parent: {
               select: {
                  id: true,
                  name: true
               }
            },
         }
      })
      const total = await prisma.department.count({
         where: conditions,
      })
      return res.status(200).json({ success: true, message: 'Departments retrieved successfully', departments, total })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
export default adminDepartmentRouter