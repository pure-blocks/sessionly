import { PrismaClient } from '@prisma/client'
import { sendBookingReminder } from '../lib/email'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

const prisma = new PrismaClient()

async function sendReminders() {
  try {
    console.log('Starting booking reminder process...')

    // Get bookings for tomorrow
    const tomorrow = addDays(new Date(), 1)
    const tomorrowStart = startOfDay(tomorrow)
    const tomorrowEnd = endOfDay(tomorrow)

    // Find all confirmed bookings for tomorrow
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'confirmed',
        availability: {
          date: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
        },
      },
      include: {
        provider: true,
        availability: true,
        tenant: true,
      },
    })

    console.log(`Found ${bookings.length} bookings for tomorrow`)

    let successCount = 0
    let failureCount = 0

    // Send reminder for each booking
    for (const booking of bookings) {
      if (!booking.provider || !booking.tenant) {
        console.log(`Skipping booking ${booking.id} - missing provider or tenant`)
        failureCount++
        continue
      }

      try {
        const result = await sendBookingReminder({
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          providerName: booking.provider.name,
          date: format(new Date(booking.availability.date), 'MMMM d, yyyy'),
          startTime: booking.availability.startTime,
          endTime: booking.availability.endTime,
          tenantName: booking.tenant.name,
          bookingId: booking.id,
        })

        if (result.success) {
          console.log(`✓ Sent reminder for booking ${booking.id} to ${booking.clientEmail}`)
          successCount++
        } else {
          console.error(`✗ Failed to send reminder for booking ${booking.id}:`, result.error)
          failureCount++
        }
      } catch (error) {
        console.error(`✗ Error sending reminder for booking ${booking.id}:`, error)
        failureCount++
      }
    }

    console.log('\n--- Summary ---')
    console.log(`Total bookings: ${bookings.length}`)
    console.log(`Successfully sent: ${successCount}`)
    console.log(`Failed: ${failureCount}`)
    console.log('Reminder process completed.')
  } catch (error) {
    console.error('Fatal error in reminder process:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

sendReminders()
