import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.APP_MAIL_HOST,
  port: process.env.APP_MAIL_PORT,
  auth: {
    user: process.env.APP_MAIL_USERNAME,
    pass: process.env.APP_MAIL_PASSWORD,
  },
});

export const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: '"deursocial" <mindeur@deursocial.com>',
    to, subject, html
  }
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export const generateWelcomeEmail = (name = 'Pengguna') => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Selamat Datang di Deursocial</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
      }
      @media only screen and (max-width: 600px) {
        .wrapper {
          padding: 15px !important;
        }
        .card {
          padding: 20px !important;
        }
        .card h2 {
          font-size: 20px !important;
        }
        .card p {
          font-size: 14px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
    <div class="wrapper" style="max-width: 600px; margin: auto; padding: 20px;">
      <div class="card" style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #2d2d2d; margin-top: 0;">🎉 Yeay! Kamu Resmi Gabung di Deursocial</h2>
        <p style="font-size: 16px; color: #555;">
          Hai <strong>${name}</strong>,
        </p>
        <p style="font-size: 16px; color: #555;">
          Terima kasih sudah daftar di <strong>Deursocial</strong>.<br />
          Saatnya cari teman barengan buat nonton konser dan seru-seruan bareng!
        </p>
        <p style="font-size: 16px; color: #555;">
          Langsung cek grupnya dan temuin yang sefrekuensi! 🙌
        </p>
        <p style="font-size: 16px; color: #888;">
          Salam seru,<br />
          <strong>Mindeur</strong>
        </p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * name is reciver email
 * title of body email
 * body of body email
 * 
 * @param {*} param0 
 * @returns 
 */
export const generateDinamicBodyEmail = ({ name = 'Pengguna', title = 'Selamat Datang di Deursocial', body='' }) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
      }
      @media only screen and (max-width: 600px) {
        .wrapper {
          padding: 15px !important;
        }
        .card {
          padding: 20px !important;
        }
        .card h2 {
          font-size: 20px !important;
        }
        .card p {
          font-size: 14px !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
    <div class="wrapper" style="margin: auto; padding: 20px;">
      <div class="card" style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
        <h2 style="color: #2d2d2d; margin-top: 0;">${title}</h2>
        <p style="font-size: 16px; color: #555;">
          Hai <strong>${name}</strong>,
        </p>
        <p style="font-size: 16px; color: #555;">${body}</p>
      </div>
    </div>
  </body>
</html>
`;