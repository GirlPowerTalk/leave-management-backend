import { z } from 'zod'

// ✅ Leave Date Schema
const leaveDateSchema = z.object({
   date: z.string({ required_error: "Date is required" })
      .datetime({ message: "Invalid date format" }),
   type: z.enum(['fullday', '1sthalf', '2ndhalf'], {
      required_error: "Type is required",
      message: "Type must be either 'fullday' or '1sthalf' or '2ndhalf'"
   }),
   value: z.number({
      required_error: "Value is required"
   }).positive("Value must be a positive number"),
   status: z.enum(['approved', 'rejected', 'pending'], {
      required_error: "Status is required",
      message: "Invalid status value"
   })
});

// ✅ Leave Dates Wrapper Schema
const leaveDatesSchema = z.object({
   dates: z.array(leaveDateSchema, {
      required_error: "Dates are required"
   }).min(1, "At least one date is required"),
   totalValue: z.number({
      required_error: "Total value is required"
   }).nonnegative("Total value must be zero or more"),
   leaveTypeId: z.number({
      required_error: "Leave Type ID is required"
   }).positive("Leave Type ID must be a positive number")
});

// ✅ Leave Type Schema
const leaveTypeSchema = z.object({
   id: z.number({
      required_error: "Leave Type ID is required"
   }).positive("Leave Type ID must be positive"),
   name: z.string({
      required_error: "Leave type name is required"
   }).min(1, "Leave type name cannot be empty"),
   code: z.string({
      required_error: "Leave type code is required"
   }).min(1, "Leave type code cannot be empty")
});

// ✅ Leave Application Detail Schema
const leaveApplicationDetailSchema = z.object({
   id: z.number({
      required_error: "ID is required"
   }).positive("ID must be a positive number"),
   applicationId: z.number({
      required_error: "Application ID is required"
   }).positive("Application ID must be a positive number"),
   leaveTypeId: z.number({
      required_error: "Leave Type ID is required"
   }).positive("Leave Type ID must be a positive number"),
   leaveCount: z.number({
      required_error: "Leave count is required"
   }).nonnegative("Leave count must be zero or more"),
   leaveDates: leaveDatesSchema,
   createdAt: z.string({
      required_error: "Created At date is required"
   }).datetime("Invalid date format"),
   leaveType: leaveTypeSchema,
   updatedLeaveCount: z.number({
      required_error: "Updated leave count is required"
   }).nonnegative("Updated leave count must be zero or more")
});

// ✅ Modify Schema
const modifySchema = z.object({
   modifyDays: z.number({
      required_error: "Modify days are required"
   }).nonnegative("Modify days must be a non-negative number"),
   modifyLeaveType: leaveTypeSchema,
   leaveType: leaveTypeSchema,
   leaveDays: z.number({
      required_error: "Leave days are required"
   }).nonnegative("Leave days must be a non-negative number")
});

// ✅ Main Schema for the Entire Object
export const updateAdminLeaveApplicationValidation = z.object({
   leaveApplicationDetails: z.array(leaveApplicationDetailSchema, {
      required_error: "Leave application details are required"
   }).min(1, "At least one leave application is required"),
   modify: z.array(modifySchema, {
      required_error: "Modify details are required"
   }),
   approved: z.boolean({
      required_error: "Approved status is required"
   }),
   hrComment: z.string()
});
