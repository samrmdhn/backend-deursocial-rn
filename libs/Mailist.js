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
    from: '"Mindeur" <mindeur@deursocial.com>',
    to, subject, html
  }
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email ${to} sent:`, info.messageId);
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
export const generateDinamicBodyEmail = ({ name = 'Pengguna', title = 'Selamat Datang di Deursocial', body = '' }) => `
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
        ${body}
      </div>
    </div>
  </body>
</html>
`;

export const templateHtmlRequestPost = ({ image = '', eventName = '', username = '', slugPost = '', idPost = '', eventId = '' }) => {
  return `<div style="max-width: 400px; margin: auto; font-family: Arial, sans-serif; text-align: center;">
        <a href="https://neundeun.deursocial.com${image}" target="_blank">
            <img 
            src="https://neundeun.deursocial.com${image}" 
            alt="Gambar dari Deursocial" 
            style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" 
            />
        </a>

        <h2 style="margin: 20px 0 10px; color: #222;">Permintaan Postingan Baru dari ${username}</h2>

        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            ${eventName}
        </p>
        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            Seorang pengguna baru saja mengajukan postingan berisi gambar seperti yang ditampilkan di atas.
            Silakan tinjau dan pilih apakah ingin <strong>menerima</strong> atau <strong>menolak</strong> postingan ini.
        </p>

        <div style="display: flex; justify-content: center; gap: 12px;">
            <a href="https://seuneu.deursocial.com/api/change/status/moment/${slugPost}?post_id=${idPost}&accepted=yes&username=${username}&event_id=${eventId}"
            style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Accept
            </a>
            <a href="https://seuneu.deursocial.com/api/change/status/moment/${slugPost}?post_id=${idPost}&accepted=no&username=${username}&event_id=${eventId}"
            style="padding: 10px 20px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reject
            </a>
        </div>
        </div>`
}


export const templateHtmlCongratUploadMomen = ({ nameUser = '', link = '', eventName }) => {
  return `
  <!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Momenmu Sudah Tampil</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #ffffff;
        margin: 0;
        padding: 0;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 0 0 rgba(0,0,0,0); /* remove shadow */
      }
      .header {
        font-size: 24px;
        font-weight: 600;
        color: #4a4a4a;
        margin-bottom: 20px;
      }
      .greeting {
        font-size: 16px;
        margin-bottom: 16px;
      }
      .content {
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .cta-button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #7c3aed;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
      }
      .footer {
        margin-top: 32px;
        font-size: 14px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">🎉 Congrats! Momenmu di Event ${eventName} sudah tampil!</div>

      <div class="greeting">Halo ${nameUser},</div>

      <div class="content">
        Sistem telah menyelesaikan proses peninjauan terhadap unggahanmu di event <strong>${eventName}</strong> dan telah menyetujui untuk ditampilkan di halaman event! 🎉
        <br /><br />
        Terima kasih sudah berbagi momen seru di event <strong>${eventName}</strong>. Unggahan kamu sekarang bisa dilihat oleh pengguna lain yang juga hadir atau follow event ini.
      </div>

      <a href="${link}" class="cta-button">📍 Lihat Unggahan Kamu</a>

      <div class="content" style="margin-top: 24px;">
        Sistem akan terus membantu menjaga agar setiap konten tetap aman, nyaman, dan seru buat semua pengguna.
        Kalau masih ada momen lain yang mau kamu bagikan, ditunggu yaa 🙌
      </div>

      <div class="footer">Salam,<br />Deursocial</div>
    </div>
  </body>
</html>
  `
}

export const reminderAnyChatOnGroups = ({ eventSlug = '', username = '', groupSlug = '', groupTitle = '' }) => {
  return `
  <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Notifikasi Pesan Baru</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #ffffff;
        color: #333333;
        line-height: 1.6;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: auto;
        border: 1px solid #e0e0e0;
        padding: 24px;
        border-radius: 8px;
        background-color: #f9f9f9;
      }
      .highlight {
        color: #7c3aed;
        font-weight: bold;
      }
      .footer {
        margin-top: 32px;
        font-size: 13px;
        color: #888888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <p>Halo <span class="highlight">${username}</span>,</p>

      <p>
        Ada pesan baru yang menunggu kamu di grup chat <strong>${groupTitle}</strong>!<br />
        Jangan sampai ketinggalan obrolan seru bersama teman-teman konsermu 🎶🔥
      </p>

      <p style="margin-top: 30px;">
        <a href="https://deursocial.com/event/${eventSlug}/group/${groupSlug}" style="text-decoration: none; background-color: #7c3aed; color: #ffffff; padding: 12px 20px; border-radius: 6px;">Buka Chat Sekarang</a>
      </p>

      <div class="footer">
        DeurSocial · A Place for Indonesia's Music Community Scene
      </div>
    </div>
  </body>
</html>
  `
}

export const reminderAnyNotification = ({ username = '' }) => {
  return `
  <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Notifikasi Pesan Baru</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #ffffff;
        color: #333333;
        line-height: 1.6;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: auto;
        border: 1px solid #e0e0e0;
        padding: 24px;
        border-radius: 8px;
        background-color: #f9f9f9;
      }
      .highlight {
        color: #7c3aed;
        font-weight: bold;
      }
      .footer {
        margin-top: 32px;
        font-size: 13px;
        color: #888888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <p>Halo <span class="highlight">${username}</span>,</p>
      <p>
        Kamu punya notifikasi baru yang belum dilihat!<br />
        Cek sekarang biar gak ketinggalan info seru di Deursocial. 🎉
      </p>
      <p style="margin-top: 30px;">
        <a href="https://deursocial.com" style="text-decoration: none; background-color: #7c3aed; color: #ffffff; padding: 12px 20px; border-radius: 6px;">Buka Deursocial Sekarang</a>
      </p>

      <div class="footer">
        DeurSocial · A Place for Indonesia's Music Community Scene
      </div>
    </div>
  </body>
</html>
  `
}