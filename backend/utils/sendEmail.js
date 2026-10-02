import nodemailer from "nodemailer"

/**
 * Send email utility optimized for Vercel serverless and local environments.
 * - Forces IPv4 (`family: 4`) to prevent Google's IPv6 anti-spam rejection on cloud serverless.
 * - Includes automatic fallback between Port 465 (SSL) and Port 587 (TLS).
 * - Supports Resend / Brevo HTTPS APIs (zero SMTP port blocking risk) if API keys are set.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  // Option 1: Resend HTTP API (if configured via RESEND_API_KEY)
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    const sender = process.env.EMAIL_FROM || "E-Paayos <onboarding@resend.dev>"
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`Resend API failed: ${errData.message || res.statusText}`)
    }
    return await res.json()
  }

  // Option 2: Brevo / Sendinblue HTTP API (if configured via BREVO_API_KEY)
  const brevoApiKey = process.env.BREVO_API_KEY
  if (brevoApiKey) {
    const senderEmail = process.env.EMAIL_USER || "support@e-paayos.com"
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "E-Paayos Support", email: senderEmail.trim() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`Brevo API failed: ${errData.message || res.statusText}`)
    }
    return await res.json()
  }

  // Option 3: Nodemailer with Gmail / Custom SMTP
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    throw new Error(
      "Email credentials missing. Please configure EMAIL_USER and EMAIL_PASS in your Vercel Environment Variables."
    )
  }

  const cleanUser = user.trim()
  const cleanPass = pass.replace(/\s+/g, "").trim()
  const senderFrom = process.env.EMAIL_FROM || `"E-Paayos Support" <${cleanUser}>`

  // If custom SMTP host is set
  if (process.env.EMAIL_HOST) {
    const customTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST.trim(),
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true" || process.env.EMAIL_PORT === "465",
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    return customTransporter.sendMail({
      from: senderFrom,
      to,
      subject,
      text: text || "",
      html: html || "",
    })
  }

  // Gmail SMTP with automatic Port 465 -> Port 587 fallback + IPv4 enforcement
  const sendWithGmailConfig = async (port, secure) => {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      pool: false,
      family: 4, // Critical for Vercel/AWS to avoid Google IPv6 spam blocking
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    return transporter.sendMail({
      from: senderFrom,
      to,
      subject,
      text: text || "",
      html: html || "",
    })
  }

  try {
    // Try SSL port 465 first
    return await sendWithGmailConfig(465, true)
  } catch (primaryErr) {
    console.warn("Gmail SMTP Port 465 failed on serverless, trying Port 587 STARTTLS...", primaryErr?.message || primaryErr)
    // Fallback to STARTTLS port 587
    return await sendWithGmailConfig(587, false)
  }
}


