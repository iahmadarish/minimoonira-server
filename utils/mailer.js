const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.error('Error with mail configuration:', error);
  } else {
    console.log('✅ Everything is Okay');
  }
}); 

// Email sending function
const sendServiceRequestEmail = async (formData) => {
  try {
    const adminMailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USERNAME}>`,
      to: process.env.EMAIL_TO,
      subject: `New Service Request: ${formData.service}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #f5f7ff; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://conqueric.com/assets/Group%2061%20(1)-YVICs3i6.png" alt="CONQUERIC Logo" style="max-width: 180px; height: auto;">
          </div>

          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
              New Service Request Received
            </h2>
            
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; margin-bottom: 20px;">
              <div style="color: #6b7280; font-weight: 500;">Service:</div>
              <div style="color: #111827; font-weight: 500;">${formData.service}</div>

              <div style="color: #6b7280; font-weight: 500;">From:</div>
              <div style="color: #111827;">${formData.name}</div>

              <div style="color: #6b7280; font-weight: 500;">Email:</div>
              <div style="color: #111827;">
                <a href="mailto:${formData.email}" style="color: #2563eb; text-decoration: none;">${formData.email}</a>
              </div>

              ${formData.phone ? `
              <div style="color: #6b7280; font-weight: 500;">Phone:</div>
              <div style="color: #111827;">
                <a href="tel:${formData.phone}" style="color: #2563eb; text-decoration: none;">${formData.phone}</a>
              </div>
              ` : ''}

              ${formData.budget ? `
              <div style="color: #6b7280; font-weight: 500;">Budget:</div>
              <div style="color: #111827;">${formData.budget}</div>
              ` : ''}

              ${formData.timeline ? `
              <div style="color: #6b7280; font-weight: 500;">Timeline:</div>
              <div style="color: #111827;">${formData.timeline}</div>
              ` : ''}
            </div>

            <div style="margin-top: 25px;">
              <div style="color: #6b7280; font-weight: 500; margin-bottom: 8px;">Project Details:</div>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; color: #111827; line-height: 1.6;">
                ${formData.message.replace(/\n/g, '<br>')}
              </div>
            </div>

            <div style="margin-top: 30px; text-align: center;">
              <a href="mailto:${formData.email}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500;">
                Reply to Client
              </a>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px;">
            <p>This request was submitted through your website contact form.</p>
            <p>© ${new Date().getFullYear()} CONQUERIC. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const userMailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USERNAME}>`,
      to: formData.email,
      subject: `Thank you for your ${formData.service} request`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #f5f7ff; padding: 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://i.ibb.co/GQYZ30Jd/Augmentic.png" alt="CONQUERIC Logo" style="max-width: 180px; height: auto;">
          </div>

          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 20px; text-align: center;">
              Thank You for Contacting CONQUERIC!
            </h2>

            <p style="color: #4b5563; line-height: 1.6; text-align: center; margin-bottom: 25px;">
              We've received your request for <strong>${formData.service}</strong> and our team will review it shortly.
              You can expect a response within 30 minute.
            </p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #111827; font-size: 18px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                Your Request Summary
              </h3>

              <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px;">
                <div style="color: #6b7280; font-weight: 500;">Service:</div>
                <div style="color: #111827; font-weight: 500;">${formData.service}</div>

                <div style="color: #6b7280; font-weight: 500;">Name:</div>
                <div style="color: #111827;">${formData.name}</div>

                <div style="color: #6b7280; font-weight: 500;">Email:</div>
                <div style="color: #111827;">${formData.email}</div>

                ${formData.phone ? `
                <div style="color: #6b7280; font-weight: 500;">Phone:</div>
                <div style="color: #111827;">${formData.phone}</div>
                ` : ''}

                ${formData.budget ? `
                <div style="color: #6b7280; font-weight: 500;">Budget:</div>
                <div style="color: #111827;">${formData.budget}</div>
                ` : ''}

                ${formData.timeline ? `
                <div style="color: #6b7280; font-weight: 500;">Timeline:</div>
                <div style="color: #111827;">${formData.timeline}</div>
                ` : ''}
              </div>
            </div>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              If you need to add any additional information or have questions, simply reply to this email.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Looking forward to working with you,</p>
              <p style="color: #111827; font-weight: 500; margin-top: 0;">The CONQUERIC Team</p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 14px;">
            <p>
              <a href="https://augmenticdigital.com" style="color: #2563eb; text-decoration: none;">Visit our website</a> | 
              <a href="mailto:${process.env.EMAIL_USERNAME}" style="color: #2563eb; text-decoration: none;">Contact us</a>
            </p>
            <p>© ${new Date().getFullYear()} CONQUERIC. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return { success: true, message: 'Emails sent successfully' };
  } catch (error) {
    console.error('Error sending emails:', error);
    throw new Error('Failed to send emails');
  }
};

module.exports = { sendServiceRequestEmail };
