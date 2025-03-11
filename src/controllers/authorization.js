
import { Router } from 'express'
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import { GoogleAuth } from '../lib/google/index.js';

const authorizationRouter = Router();

const google = new GoogleAuth({
   clientId: process.env.GOOGLE_CLIENT_ID || "",
   clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
   redirectUrl: process.env.GOOGLE_REDIRECT_URL
});

export function cookieParams() {
   return {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
      domain: process.env.ENVIRONMENT === 'production' ? '.girlpowertalk.com' : 'localhost',
   };
}
authorizationRouter.post("/login", async (req, res) => {
   try {
      const { email, password } = req.body
      // text ok
      // const user = await prisma.users.findUnique({
      //    where: { email }
      // })
      // if (!user) {
      //    return res.status(401).json({ success: false, message: 'User not found' })
      // }
      // const isMatch = await user.comparePassword(password)
      // if (!isMatch) {
      //    return res.status(401).json({ success: false, message: 'Invalid password' })
      // }
      // const payload = {
      //    id: user.id,
      //    fullName: user?.firstName ? user.firstName + '' + user.lastName : 'User',
      //    email: user.email,
      //    picture: user.picture,
      //    role: user.role,
      //    purpose: 'login'
      // }
      // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
      // res.cookie('token', token, cookieParams());
      // return res.redirect(`${process.env.ALLOWED_ORIGIN}/dashboard/login?google=success`)
      return res.status(200).json({ success: true, message: 'Login successful' })
   }
   catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error logging in', error })
   }
})
authorizationRouter.get("/google-login", async (req, res) => {
   try {
      const authorizationUrl = await google.createAuthorizationUrl({
         scopes: ["profile", "email", "openid"],
         state: 'home'
      });
      return res.redirect(authorizationUrl)
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, message: 'Error creating authorization', error })
   }
})
authorizationRouter.get("/google/callback", async (req, res) => {
   try {
      const { code } = req.query
      const user = await google.verifyAuthorizationUser(code);

      const findUser = await prisma.users.findUnique({
         where: { email: user.email }
      })
      if (!findUser) {
         return res.redirect(`${process.env.ALLOWED_ORIGIN}/login?google=error`)
      }
      await prisma.users.update({
         where: { email: user.email },
         data: {
            picture: user.picture
         }
      })
      const payload = {
         id: findUser.id,
         fullName: findUser?.firstName ? findUser.firstName + ' ' + findUser.lastName : 'User',
         email: findUser.email,
         picture: findUser.picture,
         role: findUser.role,
         purpose: 'login'
      }
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, cookieParams());
      return res.redirect(`${process.env.ALLOWED_ORIGIN}`)

   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
authorizationRouter.get('/check-token', async (req, res) => {
   try {
      const cookie_token = req.cookies.token
      function getToken() {
         const authorization = req.headers['authorization']
         if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(409).send({ login: false, message: 'token not found' })
         } else {
            return authorization.split(' ')[1]
         }
      }

      const token = cookie_token || getToken()
      if (!token) {
         return res.status(409).send({ success: false, message: "No token provided" })
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (decoded?.purpose !== 'login') return res.status(409).json({ success: false, login: false, message: 'this token not for login purpose' })

      return res.status(200).send({ success: true, login: true, decoded })
   } catch (error) {
      return res.status(500).send({ success: false, message: "Failed to authenticate token" })
   }
})
authorizationRouter.get("/logout", async (req, res) => {
   try {
      res.cookie('token', '', cookieParams());
      return res.status(200).json({ success: true, message: "Logout successful" })
      // return res.redirect(`${process.env.ALLOWED_ORIGIN}/login`)
   } catch (error) {
      console.log(error)
      return res.status(500).json({ success: false, error })
   }
})
export default authorizationRouter