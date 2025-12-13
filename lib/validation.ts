/**
 * Custom field type definitions
 */
export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'email' | 'tel' | 'date'

export interface FieldDefinition {
  name: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]  // For select fields
  defaultValue?: any
  min?: number  // For number fields
  max?: number  // For number fields
  pattern?: string  // Regex pattern for validation
  helpText?: string
}

export class ValidationError extends Error {
  public field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

/**
 * Validates custom field values against their definitions
 */
export function validateCustomFields(
  values: Record<string, any>,
  definitions: FieldDefinition[]
): void {
  const errors: string[] = []

  for (const def of definitions) {
    const value = values[def.name]

    // Check required fields
    if (def.required && (value === undefined || value === null || value === '')) {
      throw new ValidationError(def.name, `${def.label} is required`)
    }

    // Skip validation if field is not required and value is empty
    if (!def.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type-specific validation
    switch (def.type) {
      case 'number':
        if (isNaN(Number(value))) {
          throw new ValidationError(def.name, `${def.label} must be a number`)
        }
        const numValue = Number(value)
        if (def.min !== undefined && numValue < def.min) {
          throw new ValidationError(
            def.name,
            `${def.label} must be at least ${def.min}`
          )
        }
        if (def.max !== undefined && numValue > def.max) {
          throw new ValidationError(
            def.name,
            `${def.label} must be at most ${def.max}`
          )
        }
        break

      case 'select':
        if (!def.options || !def.options.includes(value)) {
          throw new ValidationError(
            def.name,
            `${def.label} must be one of: ${def.options?.join(', ')}`
          )
        }
        break

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          throw new ValidationError(def.name, `${def.label} must be a valid email`)
        }
        break

      case 'tel':
        const phoneRegex = /^[\d\s\-\+\(\)]+$/
        if (!phoneRegex.test(value)) {
          throw new ValidationError(
            def.name,
            `${def.label} must be a valid phone number`
          )
        }
        break

      case 'checkbox':
        if (typeof value !== 'boolean') {
          throw new ValidationError(def.name, `${def.label} must be true or false`)
        }
        break

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          throw new ValidationError(def.name, `${def.label} must be text`)
        }
        if (def.pattern) {
          const regex = new RegExp(def.pattern)
          if (!regex.test(value)) {
            throw new ValidationError(
              def.name,
              `${def.label} format is invalid`
            )
          }
        }
        break
    }
  }
}

/**
 * Parse JSON field definitions safely
 */
export function parseFieldDefinitions(json: string | null): FieldDefinition[] {
  if (!json) return []

  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) {
      console.warn('Field definitions is not an array')
      return []
    }
    return parsed
  } catch (error) {
    console.error('Failed to parse field definitions:', error)
    return []
  }
}

/**
 * Parse JSON custom field values safely
 */
export function parseCustomFieldValues(json: string | null): Record<string, any> {
  if (!json) return {}

  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('Custom field values is not an object')
      return {}
    }
    return parsed
  } catch (error) {
    console.error('Failed to parse custom field values:', error)
    return {}
  }
}

/**
 * Serialize custom field values to JSON string
 */
export function serializeCustomFields(values: Record<string, any>): string {
  return JSON.stringify(values)
}

/**
 * Validate and serialize custom fields in one step
 */
export function validateAndSerialize(
  values: Record<string, any>,
  definitions: FieldDefinition[]
): string {
  validateCustomFields(values, definitions)
  return serializeCustomFields(values)
}

/**
 * Get default values from field definitions
 */
export function getDefaultValues(definitions: FieldDefinition[]): Record<string, any> {
  const defaults: Record<string, any> = {}

  for (const def of definitions) {
    if (def.defaultValue !== undefined) {
      defaults[def.name] = def.defaultValue
    }
  }

  return defaults
}

/**
 * Validate booking form data
 */
export function validateBookingFormData(
  formData: Record<string, any>,
  requiredFields: string[] = ['clientName', 'clientEmail']
): void {
  for (const field of requiredFields) {
    if (!formData[field] || formData[field].trim() === '') {
      throw new ValidationError(field, `${field} is required`)
    }
  }

  // Validate email format
  if (formData.clientEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.clientEmail)) {
      throw new ValidationError('clientEmail', 'Invalid email format')
    }
  }

  // Validate phone if provided
  if (formData.clientPhone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (!phoneRegex.test(formData.clientPhone)) {
      throw new ValidationError('clientPhone', 'Invalid phone number format')
    }
  }
}
