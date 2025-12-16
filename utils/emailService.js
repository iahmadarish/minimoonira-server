import nodemailer from 'nodemailer';


const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'care2trainingglobal@gmail.com', 
    pass: 'dntkvhawmbcxpdvs' 
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
    console.log('SMTP Verification Failed:', error.message);
    console.log('Solution Steps:');
    console.log('1. Check if 2-step verification is ON');
    console.log('2. Verify app password is correct');
    console.log('3. Try enabling less secure apps');
  } else {
    console.log('SMTP Server is ready to send emails');
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


  promotionOffer: (data) => ({
    subject: `🎁 Special Offer Just For You! ${data.discountValue}${data.discountType === 'percentage' ? '%' : '৳'} Off - Mini Moonira`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ff6b35, #ff8e35); color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Mini Moonira</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Don't Miss This Special Offer!</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${data.name},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We noticed you left some amazing products in your cart. We don't want you to miss out, 
            so we've prepared a special discount just for you!
          </p>
          
          <div style="background: #fff9f5; border: 2px dashed #ff6b35; border-radius: 15px; padding: 25px; text-align: center; margin: 25px 0;">
            <h3 style="color: #ff6b35; margin: 0 0 10px 0; font-size: 22px;">${data.promotionName}</h3>
            <div style="font-size: 42px; font-weight: bold; color: #ff6b35; margin: 15px 0;">
              ${data.discountValue}${data.discountType === 'percentage' ? '%' : '৳'} OFF
            </div>
            <p style="color: #666; margin: 10px 0;">
              🎉 Use this special offer on your cart items!
            </p>
            <div style="background: #ff6b35; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px;">
              ⏰ Expires in ${data.expiryHours} hours
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://yourwebsite.com'}/profile?campaign=${data.campaignId}" 
               style="background: #ff6b35; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                      font-size: 18px; font-weight: bold; display: inline-block; transition: all 0.3s;"
               onmouseover="this.style.background='#e55a2b'; this.style.transform='translateY(-2px)';"
               onmouseout="this.style.background='#ff6b35'; this.style.transform='translateY(0)';">
              🛒 Complete Your Purchase Now
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 25px;">
            <h4 style="color: #333; margin-bottom: 15px;">💡 Why you'll love this offer:</h4>
            <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
              <li>Special discount applied automatically</li>
              <li>Limited time offer - don't wait!</li>
              <li>Secure and easy checkout process</li>
              <li>Fast delivery to your doorstep</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">Happy Shopping!<br>
          <strong>Mini Moonira Team</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.7;">
            This offer is exclusively created for you. Valid for limited time only.
          </p>
        </div>
      </div>
    `,
  }),


  abandonedCartReminder: (data) => ({
    subject: `👀 You left items in your cart - Mini Moonira`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
          <h1>Don't Forget Your Items!</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.name},</h2>
          <p>We noticed you left some items in your cart. They're waiting for you!</p>
          
          ${data.cartItems && data.cartItems.length > 0 ? `
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3 style="margin-top: 0;">Your Cart Items:</h3>
              ${data.cartItems.map(item => `
                <div style="display: flex; align-items: center; margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee;">
                  <div style="flex: 1;">
                    <strong>${item.productName}</strong>
                    ${item.variant ? `<br><small>Variant: ${item.variant}</small>` : ''}
                  </div>
                  <div style="text-align: right;">
                    <strong>৳${item.price}</strong><br>
                    <small>Qty: ${item.quantity}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://yourwebsite.com'}/cart" 
               style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    `,
  })
};

export const sendEmail = async (options) => {
  try {
    console.log('📧 Sending email to:', options.email);
    console.log('📧 Email template:', options.template);
    
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


export const sendPromotionEmail = async (emailData) => {
  return await sendEmail({
    email: emailData.to,
    template: 'promotionOffer',
    data: emailData
  });
};


export const sendAbandonedCartReminder = async (emailData) => {
  return await sendEmail({
    email: emailData.to,
    template: 'abandonedCartReminder',
    data: emailData
  });
};

export default sendEmail;