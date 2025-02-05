import { Router } from 'express'
import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';
import { adminAuthentication, userAuthentication } from '../middleware/index.js';
const leaveApplicationRouter = Router();

const transporter = nodemailer.createTransport({
   host: "mail.girlpowertalk.com",
   port: 587,
   secure: false,
   auth: {
      user: "arup.maity@girlpowertalk.com",
      pass: "Raju@4gpt"
   },
   // tls: {
   //    rejectUnauthorized: false // allow self-signed certificate
   // }
});

// let info = await transporter.sendMail({
//    from: "arup.maity@girlpowertalk.com",
//    to: "bar@example.com",
//    subject: "Hello",
//    text: "Hello world",
// });

leaveApplicationRouter.post("/apply-leave", userAuthentication(), async (req, res) => {
   try {
      const user = req.user
      console.log(user)
      const body = req.body
      console.log(body)


      
      res.status(200).json({ success: true, message: 'Success!' });
   } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: 'Something went wrong', error })
   }
})

export default leaveApplicationRouter