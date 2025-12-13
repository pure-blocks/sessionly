import Link from "next/link";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const session = await getServerSession(authOptions)

  // Get tenant slug if user has a tenant
  let tenantSlug: string | null = null
  if (session?.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { slug: true },
    })
    tenantSlug = tenant?.slug || null
  }

  // Fetch all active tenants for display
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      primaryColor: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header with Auth Links */}
        <div className="flex justify-end mb-8">
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300">
                Welcome, {session.user?.name}!
              </span>
              {tenantSlug && (
                <Link
                  href={`/admin/${tenantSlug}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          ) : (
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Multi-Tenant Booking Platform
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Book sessions with professional service providers
          </p>
        </div>

        {/* Available Organizations for Booking */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Available Organizations
          </h2>
          {tenants.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/${tenant.slug}/book`}
                  className="group block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  <div
                    className="flex items-center justify-center w-16 h-16 rounded-full mb-4 group-hover:scale-110 transition-transform"
                    style={{
                      background: `linear-gradient(to bottom right, ${tenant.primaryColor || '#3B82F6'}, ${tenant.primaryColor ? tenant.primaryColor + 'CC' : '#8B5CF6'})`
                    }}
                  >
                    {tenant.logoUrl ? (
                      <img
                        src={tenant.logoUrl}
                        alt={tenant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {getInitials(tenant.name)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {tenant.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {tenant.description || 'Professional service provider'}
                  </p>
                  <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                    Book a session
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No organizations yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Be the first to create an organization and start accepting bookings!
              </p>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Want to add your organization?
            </p>
            <Link
              href="/create-tenant"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium"
            >
              Create Your Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
