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
    'info@wencelworldwide.com',
    'wgooch@goochdesignstudio.com',
    'brando@distanthorizon.com',
];

const transporter = nodemailer.createTransport(SMTP_CONFIG);

const servicePromoTemplate = (clientName) => ({
    subject: `CONQUERIC  - 26 CONQUER Offer`,
    html: `
       <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CONQUERIC - 26 CONQUER Campaign</title>
    <style>
        /* Font Import: Quicksand (Overall) */
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap');
        /* Font Import: Michroma (for high-impact discount text) */
        @import url('https://fonts.googleapis.com/css2?family=Michroma&display=swap');


        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: "Quicksand", sans-serif;
            /* Overall Font */
            line-height: 1.6;
            color: #000000;
            background-color: #f5f7fa;
            padding: 20px;
        }

        .email-container {
            max-width: 650px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            border: 1px solid #e0e7ee;
        }

        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        td {
            padding: 0;
        }

        /* Header Section */
        .header {
            background: linear-gradient(135deg, #000000, #000000);
            color: black;
            padding: 35px 20px;
            text-align: center;
            border-bottom: 2px solid#000000;
        }

        .header-logo {
            max-width: 180px;
            height: auto;
            padding-top: 15px;
            margin-bottom: 10px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }

        .logo {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .tagline {
            font-size: 12px;
            margin-top: 5px;
            margin-bottom: 5px;
            color: white;
        }

        /* Main Content Area */
        .content {
            padding: 35px 30px;
        }

        .greeting {
            color: #1f3a5f;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 20px;
        }

        .intro-text {
            color: #000000;
            font-size: 14px;
            margin-bottom: 25px;
        }

        /* Campaign Highlight Box - NEW DESIGN */
        .campaign-box {
            background: #d6fff6;
            /* Darker background */
            border: 2px solid #f7f7f7;
            /* Bright border */
            padding-top: 35px;
            padding-bottom: 35px;
            padding-left: 5px;
            padding-right: 5px;
            margin: 5px 0;
            border-radius: 12px;
            text-align: center;
            color: rgb(228, 255, 110);
            /* Text color change */
        }

        .campaign-title {
            color: #000000;
            /* Bright primary color */
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        .campaign-discount-text {
            font-family: "Quicksand", sans-serif;
            /* Specific Font */
            font-size: 30px;
            color: #942104;
            /* Bright discount color */
            font-weight: 200;
            line-height: 1.3;
            margin-bottom: 5px;
        }

        .campaign-details {
            font-size: 18px;
            font-weight: 600;
            color: #000000;
            margin-top: 15px;
        }

        /* Discount Badge */
        .discount-badge {
            display: inline-block;
            background: #006b4b;
            /* High contrast color */
            color: rgb(255, 255, 255);
            font-weight: 700;
            font-size: 9px;
            padding: 4px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            margin-top: 5px;
            margin-bottom: 5px;
        }

        /* Service Grid Styles */
        .service-grid-table {
            width: 100%;
            margin-top: 25px;
        }

        .service-cell {
            padding: 10px;
            vertical-align: top;
        }

        .service-link {
            text-decoration: none;
            display: block;
            border: 1px solid #e0e7ee;
            border-radius: 8px;
            padding: 15px;
            height: 100%;
            background: #ffffff;
            color: #000000;
            transition: box-shadow 0.3s ease;
        }

        .service-link:hover {
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        /* Image styling for consistent size */
        .service-image {
            width: 100%;
            max-width: 100%;
            height: 120px;
            /* Enforce consistent height */
            object-fit: cover;
            /* Ensures images maintain aspect ratio */
            border-radius: 4px;
            margin-bottom: 10px;
            display: block;
            border: 1px solid #d0e0f0;
        }

        .service-title {
            color: #1f3a5f;
            font-size: 16px;
            font-weight: 700;
            margin-top: 5px;
            margin-bottom: 5px;
        }

        .service-details {
            font-size: 14px;
            color: #555;
            margin-top: 5px;
        }

        /* Section Headers */
        .section-header {
            color: #000000;
            font-size: 18px;
            font-weight: 500;
            margin: 30px 0 15px 0;
            padding-top: 30px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e0e7ee;
            text-align: center;
        }

        /* Call to Action */
        .cta-section {
            text-align: center;
            margin: 35px 0 20px 0;
            padding: 25px;
            background: linear-gradient(135deg, #1f3a5f, #0077c2);
            border-radius: 8px;
            color: white;
        }

        .cta-button {
            display: inline-block;
            background: #5bfff1;
            color: #1f3a5f;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 16px;
            margin-top: 10px;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
        }

        /* Footer */
        .footer {
            background: #1f3a5f;
            color: white;
            padding: 30px 25px;
            text-align: center;
            border-radius: 0 0 12px 12px;
        }

        /* Mobile Optimizations */
        @media (max-width: 600px) {
            .service-cell {
                display: block;
                width: 100%;
                padding: 10px 0;
            }

            .service-grid-table,
            .service-link {
                display: block;
            }

            .campaign-discount-text {
                font-size: 20px !important;
            }
        }
    </style>
</head>

<body>
    <div class="email-container">
        <table role="presentation" width="100%" class="header">
            <tr>
                <td align="center">
                    <!-- Updated Logo URL & Alt Text -->
                    <img src="https://conqueric.com/assets/logo-DcXsJPrF.png" alt="CONQUERIC Logo"
                        class="header-logo" width="180">
                    <div class="tagline">Terning Ideas into impacts</div>
                </td>
            </tr>
        </table>

        <div class="content">
            <h2 class="greeting">Dear Recipients,</h2>

            <p class="intro-text">
                For your company, the digital storefront is just as crucial as the physical
                one. This is your moment to elevate your online presence from concept to stunning reality. <a
                    href="https://www.conqueric.com/"
                    style="color: #105cff; text-decoration: none; font-weight: bold;"> CONQUERIC</a> specializes in
                crafting seamless e-commerce experiences and captivating visual branding that ensures your unique
                aesthetic stands out in the competitive fashion market. Don’t let digital opportunity wait.
                Let’s shape your next chapter—stronger, more stylish, and ready for 2026.
            </p>

            <div class="campaign-box">
                <!-- Updated Campaign Name -->
                <p class="campaign-title">26 CONQUER Offer</p>
                <div class="campaign-discount-text" style="font-family: 'Michroma', sans-serif; 
    font-size: 40px; 
    font-weight: 700; 
    line-height: 1.3; 
    margin-bottom: 5px; 
    color: #ff3300; 
    text-align:center;">
                    25% OFF ALL SERVICES
                </div>
                <div class="campaign-details">
                    + 2 years Free Technical Maintenance
                </div>
                <p style="font-size: 13px; color: #232527; margin-top: 10px;">
                    Offer strictly limited to projects initiated with a discovery call in December 2025.
                </p>
            </div>

            <h3 class="section-header">Our Kickstart Services (All Included in the Offer)</h3>

            <table role="presentation" class="service-grid-table" width="100%">
                <tr>
                    <td class="service-cell" width="50%">
                        <!-- Updated Link -->
                        <a href="http://conqueric.com/web-development" class="service-link">
                            <img src="https://cdn.dribbble.com/userupload/9146565/file/original-ec8bb14b6ab23326e030be88c5b645ae.png?resize=400x0"
                                alt="Web Development Icon" class="service-image" width="100%">
                            <div class="discount-badge">25% OFF + 2 Years Free</div>
                            <div class="service-title">Web Development</div>
                            <p class="service-details">
                                Cutting-edge front-end (React/Next.js) & scalable back-end (Node/Python) solutions for
                                high-performance web platforms.
                            </p>
                        </a>
                    </td>

                    <td class="service-cell" width="50%">
                        <!-- Updated Link -->
                        <a href="http://conqueric.com/app-development" class="service-link">
                            <img src="https://www.echoinnovateit.com/wp-content/uploads/2023/08/mobile-app-development.png"
                                alt="Mobile App Development Icon" class="service-image" width="100%">
                            <div class="discount-badge">25% OFF + 2 Years Free</div>
                            <div class="service-title">App Development</div>
                            <p class="service-details">
                                Native and cross-platform mobile apps for iOS and Android using modern frameworks like
                                React Native or Flutter.
                            </p>
                        </a>
                    </td>
                </tr>

                <tr>
                    <td class="service-cell" width="50%">
                        <!-- Updated Link -->
                        <a href="http://conqueric.com/digital-marketing" class="service-link">
                            <img src="https://ireyprod.com/wp-content/uploads/2023/01/lone-fir-creative-Which-Digital-Marketing-Services-Are-Right-For-You.webp"
                                alt="Digital Marketing Icon" class="service-image" width="100%">
                            <div class="discount-badge">25% OFF + 2 Years Free</div>
                            <div class="service-title">Digital Marketing & Branding</div>
                            <p class="service-details">
                                Comprehensive strategies for brand building, content marketing, and targeted ad
                                campaigns across all major platforms.
                            </p>
                        </a>
                    </td>

                    <td class="service-cell" width="50%">
                        <!-- Updated Link -->
                        <a href="http://conqueric.com/seo-services" class="service-link">
                            <img src="https://mews.agency/wp-content/uploads/2021/12/mews-seoo.png" alt="SEO Icon"
                                class="service-image" width="100%">
                            <div class="discount-badge">25% OFF + 2 Years Free</div>
                            <div class="service-title">SEO Services</div>
                            <p class="service-details">
                                Boost visibility with technical and on-page SEO audits and implementation, driving
                                organic traffic and higher rankings.
                            </p>
                        </a>
                    </td>
                </tr>
            </table>

            <div class="cta-section">
                <h3 class="cta-title">Ready to Kickstart Your 2026?</h3>
                <p class="cta-desc">Schedule your quick 30-minute Technical Discovery Call this December to lock in the
                    25% discount and 2 Years of free support!</p>
                <!-- Updated Mailto Subject and Email -->
                <a href="mailto:info@conqueric.com?subject=26 CONQUER: Secure 25% Discount" class="cta-button">
                    📞 Schedule Discovery Call
                </a>
            </div>
        </div>

        <div style="
    background: #1f3a5f;
    color: white;
    padding: 35px 25px;
    text-align: center;
    border-radius: 0 0 12px 12px;
    font-family: 'Quicksand', sans-serif;
">

            <div style="margin-bottom: 18px;">
                <p style="color: #ffffff; margin: 4px 0; font-size: 15px;">
                    <!-- Updated Company Name -->
                    CONQUERIC | Dhaka, Bangladesh
                </p>
                <p style="color: #ffffff; margin: 4px 0; font-size: 15px;">
                    <!-- Updated Email -->
                    📧 <a href="mailto:info@conqueric.com"
                        style="color: #68f0a7; text-decoration: none; font-weight: 600;">
                        info@conqueric.com
                    </a>
                </p>
                <p style="color: #ffffff; margin: 4px 0; font-size: 15px;">
                    <!-- Updated Phone Link and Number -->
                    📞 <a href="tel:01568202839" style="color: #68f0a7; text-decoration: none; font-weight: 600;">
                        01568202839
                    </a>
                </p>
                <p style="color: #ffffff; margin: 4px 0; font-size: 15px;">
                    <!-- Updated Website Link -->
                    🌐 <a href="http://conqueric.com" style="color: #68f0a7; text-decoration: none; font-weight: 600;">
                        conqueric.com
                    </a>
                </p>
            </div>

            <!-- Social Media Icons (Replaces Signature Box) -->
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 10px;">Connect
                    With Us</p>

                <!-- Facebook Icon -->
                <a href="https://www.facebook.com/conquericit/"
                    style="text-decoration: none; margin: 0 8px; display: inline-block;">
                    <img src="https://placehold.co/30x30/4267B2/ffffff?text=f" alt="Facebook" width="30" height="30"
                        style="border-radius: 50%; vertical-align: middle; border: 1px solid #4267B2;">
                </a>

                <!-- Instagram Icon -->
                <a href="https://www.facebook.com/conquericit/"
                    style="text-decoration: none; margin: 0 8px; display: inline-block;">
                    <img src="https://placehold.co/30x30/E1306C/ffffff?text=in" alt="Instagram" width="30" height="30"
                        style="border-radius: 50%; vertical-align: middle; border: 1px solid #E1306C;">
                </a>

                <!-- YouTube Icon -->
                <a href="https://www.facebook.com/conquericit/"
                    style="text-decoration: none; margin: 0 8px; display: inline-block;">
                    <img src="https://placehold.co/30x30/FF0000/ffffff?text=Yt" alt="YouTube" width="30" height="30"
                        style="border-radius: 50%; vertical-align: middle; border: 1px solid #FF0000;">
                </a>
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
                from: '"CONQUERIC" <weareconqueric@gmail.com>',
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