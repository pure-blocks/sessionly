import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface PageProps {
  params: {
    tenantSlug: string
    providerSlug: string
  }
}

export default async function ProviderPortfolioPage({ params }: PageProps) {
  const { tenantSlug, providerSlug } = params

  // Fetch tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  })

  if (!tenant) {
    notFound()
  }

  // Fetch provider with all portfolio data
  const provider = await prisma.provider.findFirst({
    where: {
      slug: providerSlug,
      tenantId: tenant.id,
      isActive: true,
    },
    include: {
      providerType: true,
      testimonials: {
        where: { isApproved: true },
        orderBy: { isFeatured: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  })

  if (!provider) {
    notFound()
  }

  // Parse JSON fields
  const certifications = provider.certifications
    ? JSON.parse(provider.certifications)
    : []
  const specialties = provider.specialties ? JSON.parse(provider.specialties) : []
  const galleryImages = provider.galleryImages
    ? JSON.parse(provider.galleryImages)
    : []
  const socialLinks = provider.socialLinks
    ? JSON.parse(provider.socialLinks)
    : {}

  // Calculate average rating
  const avgRating =
    provider.testimonials.length > 0
      ? provider.testimonials.reduce((sum, t) => sum + t.rating, 0) /
        provider.testimonials.length
      : 5

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <Link
            href={`/${tenantSlug}/book`}
            className="inline-flex items-center text-white/90 hover:text-white mb-6 text-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Booking
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white/20">
                {provider.profileImageUrl ? (
                  <img
                    src={provider.profileImageUrl}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {provider.providerType.icon || '👤'}
                  </div>
                )}
              </div>
            </div>

            {/* Provider Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-bold mb-2">{provider.name}</h1>
              {provider.title && (
                <p className="text-2xl text-white/90 mb-4">{provider.title}</p>
              )}

              <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-6">
                {provider.yearsExperience && (
                  <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {provider.yearsExperience}+ years
                  </div>
                )}

                <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  {avgRating.toFixed(1)} ({provider.testimonials.length} reviews)
                </div>

                {provider._count.bookings > 0 && (
                  <div className="flex items-center bg-white/20 px-4 py-2 rounded-full">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {provider._count.bookings}+ sessions
                  </div>
                )}
              </div>

              <Link
                href={`/${tenantSlug}/book?provider=${provider.id}`}
                className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition shadow-lg"
              >
                Book a Session
              </Link>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-12">
            <path
              fill="#F9FAFB"
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {provider.bio && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">About Me</h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {provider.bio}
                </p>
              </section>
            )}

            {/* Video */}
            {provider.videoUrl && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Introduction</h2>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={provider.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-200 hover:scale-105 transition-transform cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Testimonials */}
            {provider.testimonials.length > 0 && (
              <section className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  What Clients Say
                </h2>
                <div className="space-y-6">
                  {provider.testimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="border-l-4 border-blue-500 pl-6 py-4"
                    >
                      <div className="flex items-center mb-3">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${
                              i < testimonial.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-gray-700 italic mb-3">"{testimonial.text}"</p>
                      <div className="flex items-center gap-3">
                        {testimonial.clientImage && (
                          <img
                            src={testimonial.clientImage}
                            alt={testimonial.clientName}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {testimonial.clientName}
                          </p>
                          {testimonial.clientTitle && (
                            <p className="text-sm text-gray-600">
                              {testimonial.clientTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Specialties */}
            {specialties.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {specialties.map((specialty: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Certifications
                </h3>
                <ul className="space-y-3">
                  {certifications.map((cert: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700">{cert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing */}
            {provider.defaultHourlyRate && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pricing</h3>
                <p className="text-4xl font-bold text-green-600 mb-1">
                  ${provider.defaultHourlyRate}
                </p>
                <p className="text-gray-600">per hour</p>
              </div>
            )}

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Connect</h3>
                <div className="space-y-3">
                  {socialLinks.instagram && (
                    <a
                      href={socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 hover:text-pink-600 transition"
                    >
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a
                      href={socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition"
                    >
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 hover:text-blue-700 transition"
                    >
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {socialLinks.website && (
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 hover:text-purple-600 transition"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white text-center">
              <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
              <p className="mb-4 text-white/90">Book your session today!</p>
              <Link
                href={`/${tenantSlug}/book?provider=${provider.id}`}
                className="block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
