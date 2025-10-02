const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
    
  });
console.log("ENV:", process.env.EMAIL_USERNAME, process.env.EMAIL_PASSWORD);
  // 2) Send notification to admin
  const adminMailOptions = {
    from: `${options.name} <${options.email}>`,
    to: process.env.EMAIL_TO,
    subject: 'New Contact Form Submission',
    text: `
      Name: ${options.name}
      Email: ${options.email}
      Phone: ${options.phone}
      Company: ${options.company}
      Message: ${options.message}
    `,
    html: `
      <h1>New Contact Form Submission</h1>
      <p><strong>Name:</strong> ${options.name}</p>
      <p><strong>Email:</strong> ${options.email}</p>
      <p><strong>Phone:</strong> ${options.phone || 'Not provided'}</p>
      <p><strong>Company:</strong> ${options.company || 'Not provided'}</p>
      <p><strong>Message:</strong> ${options.message}</p>
    `
  };

  // 3) Send confirmation to user
  const userMailOptions = {
    from: `Augmentic Digital <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: 'Thank you for contacting us!',
    text: `
      Dear ${options.name},
      
      Thank you for reaching out to Augmentic Digital. We've received your message and our team will get back to you within 24 hours.
      
      Here's what you submitted:
      Name: ${options.name}
      Email: ${options.email}
      Phone: ${options.phone || 'Not provided'}
      Company: ${options.company || 'Not provided'}
      Message: ${options.message}
      
      If you have any urgent inquiries, please feel free to contact us directly at ${process.env.EMAIL_TO}.
      
      Best regards,
      The Augmentic Digital Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Thank you for contacting us!</h1>
        <p>Dear ${options.name},</p>
        
        <p>Thank you for reaching out to Augmentic Digital. We've received your message and our team will get back to you within 24 hours.</p>
        
        <h3 style="color: #4F46E5;">Your submission details:</h3>
        <ul>
          <li><strong>Name:</strong> ${options.name}</li>
          <li><strong>Email:</strong> ${options.email}</li>
          <li><strong>Phone:</strong> ${options.phone || 'Not provided'}</li>
          <li><strong>Company:</strong> ${options.company || 'Not provided'}</li>
          <li><strong>Message:</strong> ${options.message}</li>
        </ul>
        
        <p>If you have any urgent inquiries, please feel free to contact us directly at <a href="mailto:${process.env.EMAIL_TO}">${process.env.EMAIL_TO}</a>.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Augmentic Digital Team</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <img src="https://augmenticdigital.com/logo.png" alt="Augmentic Digital Logo" width="150">
        </div>
      </div>
    `
  };

  // 4) Send both emails
  await transporter.sendMail(adminMailOptions);
  await transporter.sendMail(userMailOptions);
};

module.exports = sendEmail;