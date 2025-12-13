'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/app/components/UserMenu'

export default function ProviderPortfolioEditor() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string
  const providerId = params.id as string

  const [provider, setProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    yearsExperience: '',
    videoUrl: '',
    certifications: [''],
    specialties: [''],
    galleryImages: [''],
    socialLinks: {
      instagram: '',
      facebook: '',
      linkedin: '',
      twitter: '',
      website: '',
    },
  })

  useEffect(() => {
    fetchProvider()
  }, [providerId])

  const fetchProvider = async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/providers/${providerId}`)
      const data = await res.json()

      if (data.provider) {
        setProvider(data.provider)

        // Parse JSON fields
        const certifications = data.provider.certifications
          ? JSON.parse(data.provider.certifications)
          : ['']
        const specialties = data.provider.specialties
          ? JSON.parse(data.provider.specialties)
          : ['']
        const galleryImages = data.provider.galleryImages
          ? JSON.parse(data.provider.galleryImages)
          : ['']
        const socialLinks = data.provider.socialLinks
          ? JSON.parse(data.provider.socialLinks)
          : {
              instagram: '',
              facebook: '',
              linkedin: '',
              twitter: '',
              website: '',
            }

        setFormData({
          title: data.provider.title || '',
          yearsExperience: data.provider.yearsExperience?.toString() || '',
          videoUrl: data.provider.videoUrl || '',
          certifications,
          specialties,
          galleryImages,
          socialLinks,
        })
      }
    } catch (error) {
      console.error('Failed to fetch provider:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || null,
          yearsExperience: formData.yearsExperience
            ? parseInt(formData.yearsExperience)
            : null,
          videoUrl: formData.videoUrl || null,
          certifications: JSON.stringify(
            formData.certifications.filter((c) => c.trim())
          ),
          specialties: JSON.stringify(formData.specialties.filter((s) => s.trim())),
          galleryImages: JSON.stringify(
            formData.galleryImages.filter((i) => i.trim())
          ),
          socialLinks: JSON.stringify(formData.socialLinks),
        }),
      })

      if (res.ok) {
        alert('Portfolio updated successfully!')
        fetchProvider()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update portfolio:', error)
      alert('Failed to update portfolio')
    } finally {
      setSaving(false)
    }
  }

  const addArrayField = (field: 'certifications' | 'specialties' | 'galleryImages') => {
    setFormData({
      ...formData,
      [field]: [...formData[field], ''],
    })
  }

  const removeArrayField = (
    field: 'certifications' | 'specialties' | 'galleryImages',
    index: number
  ) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index),
    })
  }

  const updateArrayField = (
    field: 'certifications' | 'specialties' | 'galleryImages',
    index: number,
    value: string
  ) => {
    const newArray = [...formData[field]]
    newArray[index] = value
    setFormData({
      ...formData,
      [field]: newArray,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Provider not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href={`/admin/${tenantSlug}/providers`}
                className="text-blue-600 hover:underline text-sm mb-2 block"
              >
                ← Back to Providers
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {provider.name} - Portfolio Editor
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your portfolio and professional profile
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/${tenantSlug}/${provider.slug}`}
                target="_blank"
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                View Portfolio
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Professional Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Certified Personal Trainer & Nutrition Coach"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearsExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, yearsExperience: e.target.value })
                  }
                  placeholder="10"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Media</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Introduction Video URL
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
                placeholder="https://youtube.com/embed/..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                YouTube or Vimeo embed URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Gallery Images
              </label>
              {formData.galleryImages.map((url, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) =>
                      updateArrayField('galleryImages', index, e.target.value)
                    }
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayField('galleryImages', index)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayField('galleryImages')}
                className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                + Add Image
              </button>
            </div>
          </div>

          {/* Specialties */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Specialties</h2>
            {formData.specialties.map((specialty, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) =>
                    updateArrayField('specialties', index, e.target.value)
                  }
                  placeholder="Weight Loss, Strength Training, etc."
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('specialties', index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('specialties')}
              className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              + Add Specialty
            </button>
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Certifications</h2>
            {formData.certifications.map((cert, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={cert}
                  onChange={(e) =>
                    updateArrayField('certifications', index, e.target.value)
                  }
                  placeholder="NASM Certified Personal Trainer"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('certifications', index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('certifications')}
              className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              + Add Certification
            </button>
          </div>

          {/* Social Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Instagram</label>
                <input
                  type="url"
                  value={formData.socialLinks.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: {
                        ...formData.socialLinks,
                        instagram: e.target.value,
                      },
                    })
                  }
                  placeholder="https://instagram.com/username"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Facebook</label>
                <input
                  type="url"
                  value={formData.socialLinks.facebook}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: {
                        ...formData.socialLinks,
                        facebook: e.target.value,
                      },
                    })
                  }
                  placeholder="https://facebook.com/username"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: {
                        ...formData.socialLinks,
                        linkedin: e.target.value,
                      },
                    })
                  }
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <input
                  type="url"
                  value={formData.socialLinks.website}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: {
                        ...formData.socialLinks,
                        website: e.target.value,
                      },
                    })
                  }
                  placeholder="https://yourwebsite.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Portfolio'}
            </button>
            <Link
              href={`/admin/${tenantSlug}/providers`}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
