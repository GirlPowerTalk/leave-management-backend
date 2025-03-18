import dayjs from 'dayjs';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
   service: "Gmail",
   auth: {
      user: process.env.CENTRAL_EMAIL_ADDRESS,
      pass: process.env.CENTRAL_EMAIL_PASSWORD,
   }
});

export const RequestTemplateForHr = (body) => {
   const { applicationId, employeeName, subject, reason, leaves } = body
   // Format leave details
   const leaveDetailsHtml = leaves.map(leave => `
      <div>
         <p style="margin:0; padding:0"><strong>Leave Type:</strong> ${leave?.leaveType?.label}</p>
         <p style="margin:0; padding:0"><strong>Leave Dates:</strong> ${leave?.leaveCount} days</p>
         <ul style="display:flex; flex-warp:warp; gap:4px;list-style:none; padding:0;">
            ${leave.dates.map(item => `<li>${dayjs(item?.date).format("DD/MM/YY")}</li>`).join("")}
         </ul>
      </div>
      <br/>
   `).join("");

   var mailOptions = {
      from: {
         name: 'Leave Application',
         address: 'leave.reply@girlpowertalk.com'
      },
      to: 'leave@girlpowertalk.com',
      subject: `New Leave Request from ${employeeName}`,
      html: `
      <div>
         <p>Dear Team Member</p>
         <p>A new leave request has been submitted on the MyGirlPowerTalk HRMS platform.</p>

         <p><strong>Leave Details :</strong></p>

         <p style="margin:0; padding:0"><strong>Employee Name:</strong> ${employeeName}</p>
         <br/>

         ${leaveDetailsHtml}

         <p style="margin:0; padding:0"><strong>Subject:</strong> ${subject}</p>
         <p style="margin:0; padding:0"><strong>Message:</strong> ${reason}</p>

         <br/>
         <p>Please review and take action on this request directly on the platform as soon as possible :</p>
         <a href="https://my.girlpowertalk.com/hr-dashboard/leave-applications/application-details/${applicationId}" target="_blank" style="color:#27445D;font-weight: bold;">View Leave Request</a>

         <br/>
         <br/>
         <p>Best,</p>
         <p>HR Team</p>
      </div>
      `
   };
   transporter.sendMail(mailOptions);
}
export const RequestTemplateForEmployee = (body) => {
   const { applicationId, employeeEmail, employeeName, subject, reason, leaves } = body
   // Format leave details
   const leaveDetailsHtml = leaves.map(leave => `
      <div>
         <p style="margin:0; padding:0"><strong>Leave Type:</strong> ${leave?.leaveType?.label}</p>
         <p style="margin:0; padding:0"><strong>Leave Dates:</strong> ${leave?.leaveCount} days</p>
         <ul style="display:flex; flex-warp:warp; gap:4px;list-style:none; padding:0;">
            ${leave.dates.map(item => `<li>${dayjs(item?.date).format("DD/MM/YY")}</li>`).join("")}
         </ul>
      </div>
      <br/>
   `).join("");

   var mailOptions = {
      from: {
         name: 'Leave Application',
         address: 'leave.reply@girlpowertalk.com'
      },
      to: employeeEmail,
      subject: `Your Leave Request Has Been Submitted`,
      html: `
      <div>
         <p>Dear ${employeeName},</p>
         <p>I hope this email finds you well.</p>

         <p>Your leave request for [Selected Date] has been successfully submitted on the MyGirlPowerTalk HRMS platform and is now pending HR approval. You will be notified once your request is reviewed.</p>

         <p><strong>Leave Details :</strong></p>

         ${leaveDetailsHtml}

         <p style="margin:0; padding:0"><strong>Subject:</strong> ${subject}</p>
         <p style="margin:0; padding:0"><strong>Message:</strong> ${reason}</p>
         <p style="margin:0; padding:0"><strong>Status:</strong> Pending HR Approval</p>

         <br/>
         <p>You can track the status of your request here :</p>
         <a href="https://my.girlpowertalk.com/employee/my-applications/application-form/${applicationId}" target="_blank" style="color:#27445D;font-weight: bold;">View Request Status</a>

         <br/>
         <br/>
         <p>Best,</p>
         <p>HR Team</p>
      </div>
      `
   };
   transporter.sendMail(mailOptions);
}
export const ApprovedTemplateForEmployee = (body) => {
   const { applicationId, employeeEmail, employeeName, subject, reason, leaves } = body
   // Format leave details
   const leaveDetailsHtml = leaves.map(leave => `
      <div>
         <p style="margin:0; padding:0"><strong>Leave Type:</strong> ${leave?.leaveType?.name}</p>
      </div>
      <br/>
   `).join("");

   var mailOptions = {
      from: {
         name: 'Leave Application',
         address: 'leave.reply@girlpowertalk.com'
      },
      to: employeeEmail,
      subject: `Your Leave Has Been Approved`,
      html: `
      <div>
         <p>Dear ${employeeName},</p>
         <p>I hope this email finds you well. Your leave request for [Selected Date] has been approved.</p>

         ${leaveDetailsHtml}
         <p style="margin:0; padding:0"><strong>Subject:</strong> ${subject}</p>
         <br/>
         <p>You can view the updated status on the <strong>MyGirlPowerTalk HRMS platform</strong> :</p>
         <a href="https://my.girlpowertalk.com/employee/my-applications/application-form/${applicationId}" target="_blank" style="color:#27445D;font-weight: bold;">View Details</a>

         <br/>
         <br/>
         <p>Best,</p>
         <p>HR Team</p>
      </div>
      `
   };
   transporter.sendMail(mailOptions);
}
export const RejectedTemplateForEmployee = (body) => {
   const { applicationId, employeeEmail, employeeName, rejectionReason, leaves } = body
   // Format leave details
   const leaveDetailsHtml = leaves.map(leave => `
      <div>
         <p style="margin:0; padding:0"><strong>Leave Type:</strong> ${leave?.leaveType?.name}</p>
         <p style="margin:0; padding:0"><strong>Leave Dates:</strong></p>
         <ul style="display:flex; flex-warp:warp; gap:4px;list-style:none; padding:0;">
            ${leave?.leaveDates?.dates?.map(item => `<li>${dayjs(item?.date).format("DD/MM/YY")}</li>`).join("")}
         </ul>
      </div>
      <br/>
   `).join("");

   var mailOptions = {
      from: {
         name: 'Leave Application',
         address: 'leave.reply@girlpowertalk.com'
      },
      to: employeeEmail,
      subject: `Your Leave Request Has Been Rejected`,
      html: `
      <div>
         <p>Dear ${employeeName},</p>
         <p>I hope this email finds you well.</p>
         <p>Your leave request for below dates has been <strong>rejected</strong>.</p>

         ${leaveDetailsHtml}

         <p style="margin:0; padding:0"><strong>Reason for Rejection:</strong> ${rejectionReason}</p>
         <br/>
         <p>You can check the details on the <strong>MyGirlPowerTalk HRMS platform</strong> :</p>
         <a href="https://my.girlpowertalk.com/employee/my-applications/application-form/${applicationId}" target="_blank" style="color:#27445D;font-weight: bold;">View Details</a>

         <br/>
         <br/>
         <p>Best,</p>
         <p>HR Team</p>
      </div>
      `
   };
   transporter.sendMail(mailOptions);
}