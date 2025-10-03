import nodemailer from 'nodemailer';

// সরাসরি credentials ব্যবহার করুন
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'weareconqueric@gmail.com', // সরাসরি email
    pass: 'rzluffivlcpnnmtz' // সরাসরি app password
  },
  tls: {
    rejectUnauthorized: false
  }
};

console.log('🔧 SMTP Configuration:', {
  user: SMTP_CONFIG.auth.user,
  pass: '***' + SMTP_CONFIG.auth.pass.slice(-4),
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port
});

const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verify connection
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ SMTP Verification Failed:', error.message);
    console.log('💡 Solution Steps:');
    console.log('1. Check if 2-step verification is ON');
    console.log('2. Verify app password is correct');
    console.log('3. Try enabling less secure apps');
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});

// Email templates
const emailTemplates = {
  emailVerification: (data) => ({
    subject: 'Email Verification - Mini Moonira',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
          <h1>Mini Moonira</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.name},</h2>
          <p>Your verification code is:</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: #ff6b35; color: white; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 5px; display: inline-block;">
              ${data.otp}
            </div>
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      </div>
    `,
  }),
};

export const sendEmail = async (options) => {
  try {
    console.log('📧 Sending email to:', options.email);
    
    const template = emailTemplates[options.template](options.data);

    const mailOptions = {
      from: '"Mini Moonira" <weareconqueric@gmail.com>',
      to: options.email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

export default sendEmail;