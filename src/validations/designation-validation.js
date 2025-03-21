import { z } from "zod";

export const createDesignationSchema = z.object({
   name: z.string()
      .trim()
      .min(1, { message: "Department name is required" })
      .transform(str => str.replace(/\s+/g, ' ')),
   code: z.string()
      .min(2, { message: "Code must be at least 2 characters long" })
      .transform(str => str.toUpperCase())
      .refine(str => /^[A-Z]+$/.test(str), { message: "Code must be all uppercase letters" }),
   description: z.string().optional(),
   departmentId: z.union([z.number().int().positive(), z.null()]),
   status: z.enum(["pending", "active", "inactive"]).default("active")
});

