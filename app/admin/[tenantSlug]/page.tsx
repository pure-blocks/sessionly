import { getTenant, getTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminDashboard() {
  try {
    const tenant = await getTenant()
    const { tenantId } = await getTenantContext()

    // Fetch stats
    const [providers, providerTypes, bookings, categories] = await Promise.all([
      prisma.provider.count({ where: { tenantId } }),
      prisma.providerType.count({ where: { tenantId } }),
      prisma.booking.count({ where: { tenantId } }),
      prisma.category.count({ where: { tenantId } }),
    ])

    // Fetch recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: { tenantId },
      include: {
        provider: true,
        availability: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {tenant.name}
                </h1>
                <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/${tenant.slug}/book`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  target="_blank"
                >
                  View Public Page
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Providers"
              value={providers}
              link={`/admin/${tenant.slug}/providers`}
              color="blue"
            />
            <StatCard
              title="Provider Types"
              value={providerTypes}
              link={`/admin/${tenant.slug}/provider-types`}
              color="green"
            />
            <StatCard
              title="Total Bookings"
              value={bookings}
              link={`/admin/${tenant.slug}/bookings`}
              color="purple"
            />
            <StatCard
              title="Categories"
              value={categories}
              link={`/admin/${tenant.slug}/categories`}
              color="orange"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ActionButton
                href={`/admin/${tenant.slug}/providers/new`}
                label="Add Provider"
                icon="👤"
              />
              <ActionButton
                href={`/admin/${tenant.slug}/provider-types/new`}
                label="Add Provider Type"
                icon="📋"
              />
              <ActionButton
                href={`/admin/${tenant.slug}/tools`}
                label="Admin Tools"
                icon="🛠️"
              />
              <ActionButton
                href={`/admin/${tenant.slug}/settings`}
                label="Settings"
                icon="⚙️"
              />
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">Recent Bookings</h2>
            </div>
            <div className="p-6">
              {recentBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No bookings yet. Start by adding providers and their
                  availability.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{booking.clientName}</p>
                        <p className="text-sm text-gray-600">
                          {booking.provider?.name || 'No Provider'} •{' '}
                          {new Date(
                            booking.availability.date
                          ).toLocaleDateString()}{' '}
                          at {booking.availability.startTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Getting Started */}
          {providers === 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                🚀 Getting Started
              </h3>
              <p className="text-blue-800 mb-4">
                Welcome to your admin dashboard! Here&apos;s how to get started:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Add a provider type (e.g., &quot;Personal Trainers&quot;)</li>
                <li>Add providers to your organization</li>
                <li>Configure their availability slots</li>
                <li>Share your booking page with clients</li>
              </ol>
              <div className="mt-4">
                <Link
                  href={`/admin/${tenant.slug}/provider-types`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Get Started →
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{errorMessage}</p>
          <Link
            href="/api/tenants"
            className="text-blue-600 hover:underline"
          >
            View all tenants →
          </Link>
        </div>
      </div>
    )
  }
}

function StatCard({
  title,
  value,
  link,
  color,
}: {
  title: string
  value: number
  link: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }

  return (
    <Link href={link} className="block">
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg`}></div>
        </div>
      </div>
    </Link>
  )
}

function ActionButton({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  )
}
