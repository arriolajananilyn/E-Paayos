import nodemailer from "nodemailer"

export const sendEmail = async ({ to, subject, html, text }) => {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    throw new Error("Email service is not configured. Missing EMAIL_USER or EMAIL_PASS in environment.")
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.replace(/\s+/g, "").trim(),
    },
  })

  const mailOptions = {
    from: `"E-Paayos Support" <${user.trim()}>`,
    to,
    subject,
    text: text || "",
    html: html || "",
  }

  return transporter.sendMail(mailOptions)
}
