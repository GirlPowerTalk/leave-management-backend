import { Router } from 'express'
import prisma from '../../config/prisma.js';
import { adminAuthentication } from '../../middleware/index.js';
import { z } from "zod";
import { createDesignationSchema } from '../../validations/designation-validation.js';

const adminDesignationRouter = Router();
adminDesignationRouter.use(adminAuthentication())

adminDesignationRouter.post("/create-designation", async (req, res) => {
   try {
      // Validate incoming request
      const validatedData = createDesignationSchema.parse({
         ...req.body,
         departmentId: req.body.departmentId ? Number(req.body.departmentId) : null,
      });
      const checkDesignationName = await prisma.designation.findUnique({
         where: { name: validatedData?.name }
      })
      if (checkDesignationName) return res.status(409).json({ success: false, message: 'Designation name already exists' })
      const checkDesignationCode = await prisma.designation.findUnique({
         where: { code: validatedData?.code }
      })
      if (checkDesignationCode) return res.status(409).json({ success: false, message: 'Designation code already exists' })
      const designation = await prisma.designation.create({
         data: validatedData
      })
      return res.status(201).json({ success: true, message: 'Designation created successfully', designation })
   } catch (error) {
      console.error(error)
      if (error instanceof z.ZodError) {
         return res.status(409).json({ errors: error.flatten().fieldErrors, });
      }
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDesignationRouter.put("/update-designation/:id", async (req, res) => {
   try {
      const designationId = parseInt(req.params.id)
      // Validate incoming request
      const validatedData = createDesignationSchema.parse({
         ...req.body,
         departmentId: req.body.departmentId ? Number(req.body.departmentId) : null,
      });
      // check designation name
      const checkDesignationName = await prisma.designation.findUnique({
         where: {
            name: validatedData?.name,
            NOT: { id: designationId }
         }
      })
      if (checkDesignationName) return res.status(409).json({ success: false, message: 'Designation name already exists' })
      // check designation code
      const checkDesignationCode = await prisma.designation.findUnique({
         where: {
            code: validatedData?.code,
            NOT: { id: designationId }
         }
      })
      if (checkDesignationCode) return res.status(409).json({ success: false, message: 'Designation code already exists' })
      // update designation
      const updatedDesignation = await prisma.designation.update({
         where: { id: designationId },
         data: validatedData
      })
      if (!updatedDesignation) return res.status(404).json({ success: false, message: 'Designation not found' })
      return res.status(200).json({ success: true, message: 'Designation updated successfully', updatedDesignation })
   } catch (error) {
      console.error(error)
      if (error instanceof z.ZodError) {
         return res.status(409).json({ errors: error.flatten().fieldErrors, });
      }
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDesignationRouter.get("/read-designation/:id", async (req, res) => {
   try {
      const designation = await prisma.designation.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            department: {
               select: {
                  id: true,
                  name: true,
                  code: true
               }
            },
         }
      })
      return res.status(200).json({ success: true, message: 'Designation retrieved successfully', designation })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})
adminDesignationRouter.get("/designations-list", async (req, res) => {
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
      const designations = await prisma.designation.findMany({
         where: conditions,
         ...queries,
         include: {
            department: {
               select: {
                  id: true,
                  name: true,
                  code: true
               }
            }
         }
      })
      const total = await prisma.designation.count()
      return res.status(200).json({ success: true, message: 'Departments retrieved successfully', designations, total })
   } catch (error) {
      console.error(error)
      return res.status(500).json({ success: false, message: 'Server error' })
   }
})

export default adminDesignationRouter