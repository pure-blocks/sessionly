import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, message } = body

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'to, subject, and message are required' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <p>${message}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (result.success) {
      return NextResponse.json(
        { message: 'Email sent successfully', messageId: result.messageId },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', details: error.message },
      { status: 500 }
    )
  }
}
