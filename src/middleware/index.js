// admin
import jwt from 'jsonwebtoken'

export const adminAuthentication = () => {
   return (req, res, next) => {
      try {
         const token = req.cookies.token;

         // Verify the token using the secret key from environment variables
         const decoded = jwt.verify(token, process.env.JWT_SECRET);

         // Check if the token's purpose is for login
         if (decoded?.purpose !== 'login') {
            return res.status(409).json({ success: false, login: false, message: 'This token is not for login purpose' });
         }

         // Check if the role is either 'admin' or 'superadmin'
         if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
            return res.status(409).json({ success: false, message: 'Access denied. Admin or Superadmin only.' });
         }

         // If valid role, attach decoded token data to the request and continue
         req.user = decoded;
         next();
      } catch (error) {
         // Handle token verification errors or other exceptions
         return res.status(500).json({ error: 'Internal Server Error' });
      }
   };
};


export const userAuthentication = () => {
   return (req, res, next) => {
      try {
         const token = req.cookies.token
         const decoded = jwt.verify(token, process.env.JWT_SECRET)
         if (decoded?.purpose !== 'login') {
            return res.status(409).json({ success: false, login: false, message: 'this token not for login purpose' })
         }
         req.user = decoded
         next();
      } catch (error) {
         return res.status(500).json({ error: 'Internal Server Error' });
      }
   };
}