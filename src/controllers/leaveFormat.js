import { Router } from 'express'
import prisma from '../config/prisma.js';
import { adminAuthentication } from '../middleware/index.js';
const leaveFormatRouter = Router();

leaveFormatRouter.use(adminAuthentication())

leaveFormatRouter.post('/create-format', async (req, res) => {
   try {
      const { name, description = '', type } = req.body

      const checkFormat = await prisma.leaveFormat.findUnique({
         where: { name: name }
      })
      if (checkFormat) {
         return res.status(409).json({ success: false, message: 'Format name already exists' })
      }
      const createFormat = await prisma.leaveFormat.create({
         data: {
            name,
            description,
            leaveRelationship: {
               create: type.map((item) => ({
                  type: { connect: { id: item?.typeId } },
                  leaveGiven: item?.quarterOne,
                  quarterOne: item.quarterOne,
                  quarterTwo: item.quarterTwo,
                  quarterThree: item.quarterThree,
                  quarterFour: item.quarterFour,
               })),
            }
         }
      })
      if (!createFormat) return res.status(409).json({ success: false, message: 'Error creating format' })
      return res.status(200).json({ success: true, message: 'Format created successfully' })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error creating format', error })
   }
})
leaveFormatRouter.put('/update-format/:id', async (req, res) => {
   try {
      const leaveFormatId = parseInt(req.params.id)
      const { name, description, type } = req.body
      console.log(req.body)
      const checkFormat = await prisma.leaveFormat.findUnique({
         where: {
            name: name,
            NOT: { id: leaveFormatId }
         }
      })
      if (checkFormat) {
         return res.status(409).json({ success: false, message: 'Format name already exists' })
      }
      const updatedFormat = await prisma.leaveFormat.update({
         where: { id: leaveFormatId },
         data: {
            name,
            description,
            leaveRelationship: {
               upsert: type.map((item) => ({
                  where: {
                     formatId_typeId: {
                        formatId: leaveFormatId,
                        typeId: item.typeId,
                     }
                  },
                  create: {
                     type: { connect: { id: item.typeId } },
                     leaveGiven: item?.quarterOne,
                     quarterOne: item.quarterOne,
                     quarterTwo: item.quarterTwo,
                     quarterThree: item.quarterThree,
                     quarterFour: item.quarterFour,
                  },
                  update: {
                     leaveGiven: item?.quarterOne,
                     quarterOne: item.quarterOne,
                     quarterTwo: item.quarterTwo,
                     quarterThree: item.quarterThree,
                     quarterFour: item.quarterFour,
                  },
               })),
            },
         },
      });
      if (!updatedFormat) return res.status(409).json({ success: false, message: 'Format not updated' })

      // Get an array of typeIds from the provided type array
      const typeIds = type?.map((item) => item?.typeId);
      // Delete LeaveRelationship entries not associated with the provided formatId and typeIds
      const deleteFormatRelation = await prisma.leaveRelationship.deleteMany({
         where: {
            formatId: leaveFormatId, // Match the specified formatId
            NOT: {
               typeId: {
                  in: typeIds, // Keep only the relationships with these typeIds
               },
            },
         },
      });


      return res.status(200).json({ success: true, message: 'Format updated successfully', updatedFormat })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error updating format', error })
   }
})
leaveFormatRouter.get('/read-format/:id', async (req, res) => {
   try {
      const format = await prisma.leaveFormat.findUnique({
         where: { id: parseInt(req.params.id) },
         include: {
            leaveRelationship: {
               include: {
                  type: true
               }
            }
         }
      })
      if (!format) {
         return res.status(409).json({ success: false, message: 'Format not found' })
      }
      return res.status(200).json({ success: true, message: 'Format retrieved successfully', format })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error retrieving format', error })
   }
})
// leaveFormatRouter.get('/delete-format/:id', async (req, res) => {
//    try {
//       const format = await prisma.leaveFormat.findUnique({
//          where: { id: parseInt(req.params.id) },
//          include: {
//             leaveRelationship: {
//                include: {
//                   type: true
//                }
//             }
//          }
//       })
//       if (!format) {
//          return res.status(409).json({ success: false, message: 'Format not found' })
//       }
//       return res.status(200).json({ success: true, message: 'Format retrieved successfully', format })
//    } catch (error) {
//       console.log(error)
//       return res.status(500).json({ success: false, message: 'Error retrieving format', error })
//    }
// })
leaveFormatRouter.get('/all-formats', async (req, res) => {
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
      const formats = await prisma.leaveFormat.findMany({
         where: conditions,
         include: {
            leaveRelationship: {
               include: {
                  type: true
               }
            }
         },
         take: +limit,
         skip: (+page - 1) * +limit,
         ...query
      })
      const total = await prisma.leaveFormat.count({ where: conditions })
      return res.status(200).json({ success: true, message: 'All formats retrieved successfully', formats, total })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error retrieving formats', error })
   }
})
leaveFormatRouter.get("/format-list", async (req, res) => {
   try {
      const formats = await prisma.leaveFormat.findMany()
      return res.status(200).json({ success: true, message: 'Format list retrieved successfully', formats })
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error retrieving format list', error })
   }
})
export default leaveFormatRouter

