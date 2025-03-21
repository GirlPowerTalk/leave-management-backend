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
      const checkDepartmentName = await prisma.designation.findUnique({
         where: { name: validatedData?.name }
      })
      if (checkDepartmentName) return res.status(409).json({ success: false, message: 'Designation name already exists' })
      const checkDepartmentCode = await prisma.designation.findUnique({
         where: { code: validatedData?.code }
      })
      if (checkDepartmentCode) return res.status(409).json({ success: false, message: 'Designation code already exists' })
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
adminDesignationRouter.get("/designations-list", async (req, res) => {
   try {
      const designations = await prisma.designation.findMany({
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