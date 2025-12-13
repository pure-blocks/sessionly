import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 5000,
  socketTimeout: 5000,
})

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version if not provided
    })

    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error }
  }
}

interface BookingConfirmationData {
  clientName: string
  clientEmail: string
  providerName: string
  providerEmail: string
  date: string
  startTime: string
  endTime: string
  partySize: number
  totalPrice?: number
  notes?: string
  tenantName: string
  bookingId: string
}

export async function sendBookingConfirmationToClient(data: BookingConfirmationData) {
  const subject = `Booking Confirmation - ${data.tenantName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3B82F6; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.clientName},</p>
          <p>Your booking has been confirmed. Here are the details:</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span> ${data.bookingId}
            </div>
            <div class="detail-row">
              <span class="detail-label">Provider:</span> ${data.providerName}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${data.startTime} - ${data.endTime}
            </div>
            <div class="detail-row">
              <span class="detail-label">Party Size:</span> ${data.partySize} ${data.partySize === 1 ? 'person' : 'people'}
            </div>
            ${data.totalPrice ? `
            <div class="detail-row">
              <span class="detail-label">Total Price:</span> $${data.totalPrice.toFixed(2)}
            </div>
            ` : ''}
            ${data.notes ? `
            <div class="detail-row">
              <span class="detail-label">Notes:</span> ${data.notes}
            </div>
            ` : ''}
          </div>

          <p>If you have any questions or need to make changes, please contact ${data.providerName} at ${data.providerEmail}.</p>
          <p>We look forward to seeing you!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  })
}

export async function sendBookingNotificationToProvider(data: BookingConfirmationData) {
  const subject = `New Booking - ${data.date} at ${data.startTime}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10B981; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Booking Received!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.providerName},</p>
          <p>You have a new booking:</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span> ${data.bookingId}
            </div>
            <div class="detail-row">
              <span class="detail-label">Client:</span> ${data.clientName}
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span> ${data.clientEmail}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${data.startTime} - ${data.endTime}
            </div>
            <div class="detail-row">
              <span class="detail-label">Party Size:</span> ${data.partySize} ${data.partySize === 1 ? 'person' : 'people'}
            </div>
            ${data.totalPrice ? `
            <div class="detail-row">
              <span class="detail-label">Total Price:</span> $${data.totalPrice.toFixed(2)}
            </div>
            ` : ''}
            ${data.notes ? `
            <div class="detail-row">
              <span class="detail-label">Client Notes:</span> ${data.notes}
            </div>
            ` : ''}
          </div>

          <p>Please prepare for this session and reach out to the client if needed.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.providerEmail,
    subject,
    html,
  })
}

interface BookingCancellationData {
  clientName: string
  clientEmail: string
  providerName: string
  providerEmail: string
  date: string
  startTime: string
  endTime: string
  reason?: string
  tenantName: string
  bookingId: string
}

export async function sendBookingCancellationToClient(data: BookingCancellationData) {
  const subject = `Booking Cancelled - ${data.tenantName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #EF4444; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.clientName},</p>
          <p>Your booking has been cancelled.</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span> ${data.bookingId}
            </div>
            <div class="detail-row">
              <span class="detail-label">Provider:</span> ${data.providerName}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${data.startTime} - ${data.endTime}
            </div>
            ${data.reason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span> ${data.reason}
            </div>
            ` : ''}
          </div>

          <p>If you have any questions, please contact ${data.providerName} at ${data.providerEmail}.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  })
}

export async function sendBookingCancellationToProvider(data: BookingCancellationData) {
  const subject = `Booking Cancelled - ${data.date} at ${data.startTime}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #F59E0B; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.providerName},</p>
          <p>A booking has been cancelled:</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span> ${data.bookingId}
            </div>
            <div class="detail-row">
              <span class="detail-label">Client:</span> ${data.clientName}
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span> ${data.clientEmail}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${data.startTime} - ${data.endTime}
            </div>
            ${data.reason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span> ${data.reason}
            </div>
            ` : ''}
          </div>

          <p>This time slot is now available for other bookings.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.providerEmail,
    subject,
    html,
  })
}

interface WelcomeEmailData {
  name: string
  email: string
  tenantName?: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const subject = `Welcome to ${data.tenantName || 'Yodha'}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3B82F6; color: white; padding: 30px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.name},</p>
          <p>Welcome to ${data.tenantName || 'Yodha'}! We're excited to have you on board.</p>
          <p>You can now start exploring our services and make bookings with our providers.</p>
          <p>If you have any questions or need assistance, feel free to reach out to us.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName || 'Yodha'}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.email,
    subject,
    html,
  })
}

interface BookingReminderData {
  clientName: string
  clientEmail: string
  providerName: string
  date: string
  startTime: string
  endTime: string
  tenantName: string
  bookingId: string
}

export async function sendBookingReminder(data: BookingReminderData) {
  const subject = `Reminder: Upcoming Booking Tomorrow - ${data.tenantName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #8B5CF6; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
        .booking-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #8B5CF6; }
        .detail-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${data.clientName},</p>
          <p>This is a friendly reminder about your upcoming booking:</p>

          <div class="booking-details">
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span> ${data.bookingId}
            </div>
            <div class="detail-row">
              <span class="detail-label">Provider:</span> ${data.providerName}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${data.date}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${data.startTime} - ${data.endTime}
            </div>
          </div>

          <p>We look forward to seeing you!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.clientEmail,
    subject,
    html,
  })
}

interface ProviderInvitationData {
  providerName: string
  providerEmail: string
  tenantName: string
  tenantSlug: string
  loginUrl: string
  email: string
  temporaryPassword: string
  providerType: string
}

export async function sendProviderInvitation(data: ProviderInvitationData) {
  const subject = `You've been invited to join ${data.tenantName} as a ${data.providerType}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 30px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; margin-top: 20px; }
        .credentials-box { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10B981; border-radius: 5px; }
        .credential-row { padding: 10px 0; font-size: 14px; }
        .credential-label { font-weight: bold; color: #555; display: inline-block; width: 120px; }
        .credential-value { font-family: 'Courier New', monospace; background-color: #f0f0f0; padding: 5px 10px; border-radius: 3px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        .steps { background-color: white; padding: 20px; margin: 20px 0; }
        .step { padding: 10px 0; border-bottom: 1px solid #eee; }
        .step:last-child { border-bottom: none; }
        .step-number { display: inline-block; width: 30px; height: 30px; background-color: #10B981; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${data.tenantName}!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">You've been added as a ${data.providerType}</p>
        </div>
        <div class="content">
          <p>Hi ${data.providerName},</p>
          <p>Great news! You've been invited to join <strong>${data.tenantName}</strong> as a ${data.providerType}. You can now manage your availability, view bookings, and connect with clients.</p>

          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #10B981;">Your Login Credentials</h3>
            <div class="credential-row">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${data.email}</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${data.temporaryPassword}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
          </div>

          <div class="steps">
            <h3 style="margin-top: 0;">Getting Started</h3>
            <div class="step">
              <span class="step-number">1</span>
              Click the button below to access the login page
            </div>
            <div class="step">
              <span class="step-number">2</span>
              Log in using the credentials provided above
            </div>
            <div class="step">
              <span class="step-number">3</span>
              Complete your profile and add your bio
            </div>
            <div class="step">
              <span class="step-number">4</span>
              Set up your availability and start accepting bookings
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${data.loginUrl}" class="button">Access Provider Dashboard</a>
          </div>

          <p style="margin-top: 30px;">If you have any questions or need assistance getting started, please don't hesitate to reach out.</p>

          <p>Welcome aboard!</p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${data.tenantName}.</p>
          <p style="margin-top: 10px; font-size: 11px;">Login URL: ${data.loginUrl}</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: data.providerEmail,
    subject,
    html,
  })
}
