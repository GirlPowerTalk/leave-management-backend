import { Router } from 'express'
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';

const holidayRouter = Router();

holidayRouter.post("/create-holiday", adminAuthentication(), async (req, res) => {
   try {
      const { name, date, description = '', festive } = req.body
      const checkHoliday = await prisma.holidays.findUnique({
         where: { name }
      })
      if (checkHoliday) {
         return res.status(409).json({ message: "Holiday already exists" });
      }
      const holiday = await prisma.holidays.create({
         data: { name, date, description, festive }
      });
      return res.json({ success: true, holiday, message: "Holiday created successfully" });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
   }
})
holidayRouter.put("/update-holiday/:id", adminAuthentication(), async (req, res) => {
   try {
      const holidayId = parseInt(req.params.id);
      const { name, date, description = '', festive } = req.body;
      const checkHoliday = await prisma.holidays.findUnique({
         where: {
            name,
            NOT: { id: holidayId }
         }
      })
      if (checkHoliday) {
         return res.status(409).json({ message: "Holiday already exists" });
      }
      await prisma.holidays.update({
         where: { id: holidayId },
         data: { name, date, description, festive }
      });
      return res.json({ message: "Holiday updated successfully" });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
   }
})
holidayRouter.get("/read-holiday/:id", async (req, res) => {
   try {
      const holiday = await prisma.holidays.findUnique({
         where: { id: parseInt(req.params.id) }
      });
      if (!holiday) {
         return res.status(409).json({ message: "Holiday not found" });
      }
      return res.json({ success: true, holiday });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
   }
})
holidayRouter.get("/get-holidays", async (req, res) => {
   try {
      const { page = 1, limit = 25, search } = req.query
      const conditions = {};
      if (search) {
         conditions.name = { contains: search, mode: "insensitive" };
      }
      const holidays = await prisma.holidays.findMany({
         where: conditions,
         take: parseInt(limit) || 25,
         skip: (parseInt(page) - 1) * parseInt(limit) || 0,
         orderBy: { date: 'asc' }
      });
      const total = await prisma.holidays.count({
         where: conditions
      })
      return res.json({ success: true, holidays, total });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
   }
})

holidayRouter.get("/leave-holidays", async (req, res) => {
   try {
      const holidays = await prisma.holidays.findMany({
         where: { festive: false },
         orderBy: { date: 'asc' }
      })
      return res.json({ success: true, holidays, message: "Leave application submitted successfully" });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
   }
})


export default holidayRouter