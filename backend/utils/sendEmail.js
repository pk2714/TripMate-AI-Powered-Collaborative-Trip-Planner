const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 587 ? false : true, // 465=SSL, 587=STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  // In development without SMTP creds configured, just log instead of failing.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[email skipped — no SMTP config] to=${to} subject="${subject}"`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
