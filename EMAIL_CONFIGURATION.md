# Email Configuration Guide

This application uses **Nodemailer** to send transactional emails via SMTP. Emails are sent for various events including booking confirmations, cancellations, user registration, and reminders.

## SMTP Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# SMTP Email Configuration
SMTP_HOST="smtp-relay.sendinblue.com"
SMTP_PORT="587"
SMTP_USERNAME="your-email@example.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM_EMAIL="your-email@example.com"
SMTP_FROM_NAME="Your App Name"
```

### Supported SMTP Providers

The email service works with any SMTP provider. Here are some popular options:

#### Sendinblue (Brevo)
```env
SMTP_HOST="smtp-relay.sendinblue.com"
SMTP_PORT="587"
```

#### Gmail
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
```
Note: You'll need to use an App Password, not your regular Gmail password.

#### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USERNAME="apikey"
SMTP_PASSWORD="your-sendgrid-api-key"
```

#### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
```

#### Amazon SES
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
```

## Email Types

### 1. Booking Confirmation (Client)
Sent to clients when they make a new booking.

**Trigger:** New booking created via `POST /api/[tenantSlug]/bookings`

**Contains:**
- Booking ID
- Provider name
- Date and time
- Party size
- Total price (if applicable)
- Client notes

### 2. Booking Notification (Provider)
Sent to providers when they receive a new booking.

**Trigger:** New booking created via `POST /api/[tenantSlug]/bookings`

**Contains:**
- Booking ID
- Client name and email
- Date and time
- Party size
- Total price (if applicable)
- Client notes

### 3. Booking Cancellation (Client & Provider)
Sent to both parties when a booking is cancelled.

**Trigger:** Booking status changed to 'cancelled' via `PATCH /api/[tenantSlug]/bookings/[id]`

**Contains:**
- Booking ID
- Provider/Client name
- Date and time
- Cancellation reason (if provided)

### 4. Welcome Email
Sent to new users upon registration.

**Trigger:** New user created via `POST /api/auth/register`

**Contains:**
- Welcome message
- Tenant information (if applicable)

### 5. Provider Invitation
Sent to providers when an admin adds them to the system.

**Trigger:** New provider created via `POST /api/[tenantSlug]/providers`

**Contains:**
- Login credentials (email and temporary password)
- Login URL
- Provider type information
- Getting started guide
- Security reminder to change password

**Note:** When a provider is created:
- A user account is automatically created with role "provider"
- A secure temporary password is generated (12 characters, mixed case, numbers, symbols)
- The provider receives an invitation email with login credentials
- The admin also receives the credentials in the API response
- Providers should change their password after first login

### 6. Booking Reminder
Sent to clients 24 hours before their booking.

**Trigger:** Run the reminder script (see below)

**Contains:**
- Booking ID
- Provider name
- Date and time

## Testing Email Configuration

### Method 1: API Endpoint

Use the test email endpoint to verify your SMTP configuration:

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "This is a test email from Yodha"
  }'
```

### Method 2: Create a Test Booking

1. Start your development server: `npm run dev`
2. Create a booking through your application
3. Check both client and provider email addresses for confirmation emails

## Sending Booking Reminders

### Manual Execution

Run the reminder script manually to send reminders for tomorrow's bookings:

```bash
npx tsx scripts/send-booking-reminders.ts
```

### Automated Execution (Production)

Set up a cron job to run the reminder script daily:

#### Option 1: System Cron (Linux/Mac)

Edit your crontab:
```bash
crontab -e
```

Add this line to run daily at 9 AM:
```
0 9 * * * cd /path/to/yodha && npx tsx scripts/send-booking-reminders.ts >> /var/log/yodha-reminders.log 2>&1
```

#### Option 2: Node-Cron (Application-Level)

Install node-cron:
```bash
npm install node-cron
```

Create a scheduler file and import it in your application.

#### Option 3: External Scheduler

Use services like:
- **Vercel Cron** (if deployed on Vercel)
- **AWS EventBridge**
- **Google Cloud Scheduler**
- **Heroku Scheduler**

## Email Service API

The email service is located in `lib/email.ts` and provides the following functions:

### Core Function

```typescript
sendEmail({ to, subject, html, text? }): Promise<{ success: boolean, messageId?: string, error?: any }>
```

### Helper Functions

```typescript
// Booking emails
sendBookingConfirmationToClient(data: BookingConfirmationData)
sendBookingNotificationToProvider(data: BookingConfirmationData)
sendBookingCancellationToClient(data: BookingCancellationData)
sendBookingCancellationToProvider(data: BookingCancellationData)

// User emails
sendWelcomeEmail(data: WelcomeEmailData)
sendProviderInvitation(data: ProviderInvitationData)

// Reminder emails
sendBookingReminder(data: BookingReminderData)
```

## Customization

### Modifying Email Templates

Email templates are defined in `lib/email.ts`. Each email function contains inline HTML templates. To customize:

1. Open `lib/email.ts`
2. Find the relevant email function (e.g., `sendBookingConfirmationToClient`)
3. Modify the HTML template in the `html` variable
4. Restart your application

### Styling

Emails use inline CSS for maximum compatibility across email clients. The default styling includes:

- Responsive design (max-width: 600px)
- Color-coded headers for different email types
- Professional typography
- Clean, minimal design

### Adding New Email Types

To add a new email type:

1. Define a new interface for the email data
2. Create a new function in `lib/email.ts`
3. Use the `sendEmail` function to send the email
4. Call your function from the appropriate API route

Example:
```typescript
interface CustomEmailData {
  // Define your data structure
}

export async function sendCustomEmail(data: CustomEmailData) {
  const subject = 'Your Subject'
  const html = `<!-- Your HTML template -->`

  return sendEmail({ to: data.email, subject, html })
}
```

## Troubleshooting

### Email not sending

1. **Check environment variables**: Ensure all SMTP variables are correctly set
2. **Check SMTP credentials**: Verify username and password
3. **Check firewall**: Ensure port 587 is not blocked
4. **Check logs**: Look for error messages in console output
5. **Test with curl**: Use the test endpoint to isolate the issue

### Emails going to spam

1. **Configure SPF records**: Add SPF record to your domain DNS
2. **Configure DKIM**: Enable DKIM in your SMTP provider
3. **Use verified sender**: Ensure FROM email is verified with your provider
4. **Avoid spam triggers**: Don't use excessive caps, exclamation marks, or spam keywords

### Connection timeout

1. **Check network**: Ensure internet connection is stable
2. **Try different port**: Some networks block port 587, try 465 or 2525
3. **Check SMTP host**: Verify the SMTP host address is correct
4. **Increase timeout**: Modify timeout values in `lib/email.ts`

## Production Best Practices

1. **Rate Limiting**: Implement rate limiting to avoid SMTP provider limits
2. **Email Queue**: Consider using a queue system (Bull, BullMQ) for high volume
3. **Monitoring**: Set up monitoring for email delivery failures
4. **Logging**: Log all email attempts with timestamps and recipients
5. **Retry Logic**: Implement retry logic for failed sends
6. **Unsubscribe**: Add unsubscribe links for marketing emails
7. **Template Testing**: Test emails across different clients (Gmail, Outlook, etc.)

## Security

1. **Never commit credentials**: Keep `.env` file in `.gitignore`
2. **Use environment variables**: Store all sensitive data in env vars
3. **Rotate credentials**: Regularly rotate SMTP passwords
4. **Validate input**: Always validate email addresses before sending
5. **Rate limit**: Prevent abuse with rate limiting

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify SMTP provider status
3. Test with the test endpoint
4. Review this documentation

## License

This email configuration is part of the Yodha application.
