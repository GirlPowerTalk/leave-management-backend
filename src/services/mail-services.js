

var transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.CENTRAL_EMAIL_ADDRESS,
      pass:process.env.CENTRAL_EMAIL_PASSWORD // login password
   }
});

// verify connection configuration
// transporter.verify(function (error, success) {
//    if (error) {
//       console.log('error =>', error);
//    } else {
//       console.log("Server is ready to take our messages");
//    }
// });

// transporter.sendMail(requestParams.email, function (error, info) {
//    if (error) {
//       console.log(error);
//    } else {
//       // console.log('Email sent: ' + info.response);
//    }
// });

var mailOptions = {
   from: {
      name: 'Reciept',
      address: 'noreply@blueoceanglobaltech.com'
   },
   to: correo,
   subject: "Thank you for your payment",
   html: body
};

const mailService = {

}