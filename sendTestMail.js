import nodemailer from 'nodemailer';
import 'dotenv/config';

const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
};

const TARGET_EMAILS = [
    'im.ishaq.bd@gmail.com',
    'helloeurope@profitabil.com',
    'hellousa@profitabil.com',
];

const transporter = nodemailer.createTransport(SMTP_CONFIG);

const servicePromoTemplate = (clientName) => ({
    subject: `Transform Your Digital Presence with CONQUERIC's Digital Expertise`,
    html: `
        <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ishaq - Strategic MERN Stack & Digital Solutions Partner</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">
    <style>
        /* General Reset & Body */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f4f4f4;
            padding: 20px;
        }

        .email-container {
            max-width: 700px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }

        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        td {
            padding: 0;
        }

        /* Header Styles - Changed Gradient Color */
        .header {
            background: linear-gradient(135deg, #0a2a1c 0%, #06140b 100%);
            /* Deep Green/Blue for Professionalism */
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }

        .profile-image {
            width: 100px;
            /* Slightly smaller for professional look */
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid rgba(255, 255, 255, 0.3);
            margin: 0 auto 15px;
            display: block;
            background-color: #f0f0f0;
        }

        .content {
            padding: 40px 35px;
            background: #ffffff;
        }

        .greeting {
            color: #06140b;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 25px;
            border-left: 2px solid #0a2a1c;
            padding-left: 15px;
        }

        .intro-text {
            color: #555;
            font-size: 16px;
            margin-bottom: 20px;
            text-align: justify;
        }

        /* Highlight Box - Now Partnership Focus */
        .highlight-box {
            background: linear-gradient(120deg, #e7f5e8 0%, #d4e9d7 100%);
            padding: 25px;
            border-radius: 15px;
            margin: 30px 0;
            border-left: 2px solid #0a2a1c;
        }

        /* New Feature Grid/Card Styling */
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            /* 2 columns for larger screens */
            gap: 20px;
            padding: 0;
            list-style: none;
            margin: 0;
        }

        .feature-grid li {
            background: #ffffff;
            /* White card background */
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
            border-top: 3px solid #0a2a1c;
            /* A subtle color line */
        }

        .feature-grid li:hover {
            transform: translateY(-3px);
            /* Interactive effect */
        }

        .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #0a2a1c;
            display: block;
        }

        .feature-grid strong {
            font-size: 16px;
            display: block;
            margin-bottom: 5px;
            color: #06140b;
        }

        .feature-grid p {
            font-size: 13px;
            color: #555;
            line-height: 1.5;
        }

        .offer-block {
            background: #fffdfd;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin: 30px 0;
            border: 1px solid #0a2a1c;
        }

        .footer {
            background: #0a2a1c;
            color: white;
            text-align: center;
            padding: 30px 20px;
        }

        .social-links {
            margin: 20px 0;
        }

        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: white;
            text-decoration: none;
            transition: color 0.3s;
        }

        .social-link:hover {
            color: #8fd19e;
        }

        /* Mobile Adjustments for Grid */
        @media (max-width: 600px) {
            .feature-grid {
                grid-template-columns: 1fr;
                /* Single column on mobile */
            }
        }
    </style>
</head>

<body>
    <div class="email-container">
        <table role="presentation" width="100%" class="header">
            <tr>
                <td align="center">
                    <img src="https://res.cloudinary.com/dq64rvefq/image/upload/v1764436508/Gemini_Generated_Image_t99ol5t99ol5t99o_jobuqr.png"
                        alt="Ishaq Ahmad" class="profile-image">
                    <div
                        style="font-size: 38px; font-weight: 700; margin-bottom: 5px; text-shadow: 1px 1px 3px rgba(0,0,0,0.4);">
                        ISHAQ AHMAD</div>
                    <div style="font-size: 20px; opacity: 0.9; font-weight: 300; margin-bottom: 15px;">Strategic Tech
                        Partner for Digital Agencies</div>
                    <div style="font-size: 16px; opacity: 0.8; font-weight: 300;">Full-Stack Development • Custom Apps •
                        Design Integration</div>
                </td>
            </tr>
        </table>

        <div class="content">
            <h2 class="greeting">Hello Profitabil Authorities,</h2>

            <p class="intro-text">
                I am Ishaq Ahmad, and I lead a dedicated team of MERN Stack, App Development, and Design specialists. We
                recognize your company's strong reputation in the Branding, SEO and Digital Marketing space.
            </p>

            <p class="intro-text">
                We're reaching out not as a direct service provider, but with a proposal for a strategic partnership. We
                aim to become your reliable, high-quality in-house technical arm for clients requiring robust
                development and design to complement your marketing expertise.
            </p>

            <div class="highlight-box">
                <div
                    style="color: #06140b; font-size: 22px; font-weight: 700; margin-bottom: 15px; text-align: center;">
                    Our Technical Advantage
                </div>

                <ul class="feature-grid">
                    <li>
                        <span class="feature-icon">⚡</span>
                        <strong>MERN Stack Performance & SEO</strong>
                        <p>Develop scalable, secure, and performant web apps that inherently boost Core Web Vitals and
                            search rankings.</p>
                    </li>
                    <li>
                        <span class="feature-icon">📲</span>
                        <strong>End-to-End App Development</strong>
                        <p>Seamlessly offer custom iOS/Android solutions that integrate with your clients' marketing
                            strategy and backends.</p>
                    </li>
                    <li>
                        <span class="feature-icon">👩‍💻</span>
                        <strong>Conversion-Driven UI/UX Design</strong>
                        <p>High-fidelity (Figma) design services focused on maximizing user flow, retention, and
                            conversion rates.</p>
                    </li>
                    <li>
                        <span class="feature-icon">🛡️</span>
                        <strong>Infrastructure & Reliability (24/7)</strong>
                        <p>Full-service hosting, deployment, and maintenance, guaranteeing high uptime and security for
                            your referred projects.</p>
                    </li>
                </ul>
            </div>

            <div class="offer-block">
                <h3 style="margin-bottom: 15px; font-size: 24px; color: #012b0b;">Partnership for Accelerated Growth &
                    Profitability</h3>
                <p style="margin-bottom: 20px; opacity: 100; font-size: 15px;">
                    We don't just complete projects; we create a structured, highly efficient pipeline that allows your
                    Company to <span style="color: #064edd; font-weight: bold;"> **scale its development services
                        overnight** </span>without the risk and cost of expanding an internal team.
                </p>
                <p style="font-weight: 600; font-size: 15px;">
                    This technical synergy enables you to offer a robust, premium full-stack solution to your clients,
                    ensuring **maximum quality** and securing **significantly higher profit margins** on every project.
                </p>
            </div>

            <p class="intro-text" style="text-align: center; margin-top: 30px;">
                We are confident that our technical capacity, combined with your market expertise, will create a
                powerful and lucrative collaboration. We look forward to building this strategic partnership with you,
                utilizing my team's services and technical expertise to achieve mutual growth.
            </p>
        </div>

        <div class="footer">
            <div style="margin: 25px 0;">
                <h3 style="color: white; margin-bottom: 15px; font-size: 20px;"></h3>
                <div style="margin: 8px 0; font-size: 15px;">📧 <a href="mailto:info@conqueric.com"
                        style="color: #8fd19e; text-decoration: none; font-weight: 600;">info@conqueric.com</a></div>
                <div style="margin: 8px 0; font-size: 15px;">🌐 <a href="https://conqueric.com"
                        style="color: #8fd19e; text-decoration: none;">conqueric.com</a></div>
            </div>

            <div class="social-links">
                <a href="https://wa.me/8801568202839" class="social-link" title="WhatsApp">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path
                            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893-.001-3.189-1.262-6.187-3.55-8.444" />
                    </svg>
                </a>
                <a href="https://www.linkedin.com/in/iahmadarish/" class="social-link" title="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path
                            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                </a>
            </div>

            <div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="font-weight: 600; margin-bottom: 5px;">Best regards,</p>
                <p style="margin-bottom: 5px;"><strong>Ishaq Ahmad</strong></p>
                <p style="opacity: 0.9; font-size: 14px;">Business coordinator</p>
            </div>
        </div>
    </div>
</body>

</html>
    `,
});

const sendBulkEmail = async () => {
    console.log('--- Starting Email Campaign ---');

    for (const email of TARGET_EMAILS) {
        try {
            const clientName = email.split('@')[0].includes('.')
                ? email.split('@')[0].split('.').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
                : 'Valued Client';

            const template = servicePromoTemplate(clientName);

            const mailOptions = {
                from: '"CONQUERIC" <conqueric@gmail.com>',
                to: email,
                subject: template.subject,
                html: template.html,
            };

            const result = await transporter.sendMail(mailOptions);
            console.log(`Success: Email sent to ${email}. Message ID: ${result.messageId}`);

        } catch (error) {
            console.error(`Failed: Could not send email to ${email}. Error: ${error.message}`);
        }
    }

    console.log('--- Campaign Finished ---');
};

sendBulkEmail();