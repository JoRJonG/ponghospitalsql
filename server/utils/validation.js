import Joi from 'joi'

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })
    if (error) {
      const errors = error.details.map(detail => detail.message)
      return res.status(400).json({ error: 'Validation failed', details: errors })
    }
    next()
  }
}

// Schemas
export const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username must be less than 50 characters'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters'
  })
})

export const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(8).required(),
  email: Joi.string().email().optional()
})

export const announcementSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().allow('', null).max(10000).optional(),
  category: Joi.string().required(),
  publishedAt: Joi.date().optional().allow(null),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  attachments: Joi.array().optional()
}).unknown(true)

export const activitySchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('', null).max(10000).optional(),
  date: Joi.date().required(),
  publishedAt: Joi.date().optional().allow(null),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  imageUrls: Joi.alternatives().try(Joi.string().uri(), Joi.array().items(Joi.string().uri())).optional(),
  images: Joi.array().optional()
}).unknown(true)

export const documentSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('', null).max(5000).optional(),
  category: Joi.string().required(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  displayOrder: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
}).unknown(true)

export const slideSchema = Joi.object({
  title: Joi.string().allow('', null).max(200).optional(),
  caption: Joi.string().allow('', null).max(500).optional(),
  alt: Joi.string().allow('', null).max(200).optional(),
  href: Joi.string().allow('', null).max(500).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  order: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  duration: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
}).unknown(true)

export const executiveSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  position: Joi.string().allow('', null).max(200).optional(),
  phone: Joi.string().allow('', null).max(50).optional(),
  bio: Joi.string().allow('', null).max(5000).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  imageUrl: Joi.string().uri().optional().allow('', null)
}).unknown(true)

export const userSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(), // optional on update
  password: Joi.string().min(8).optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
}).unknown(true)

export const organizationSchema = Joi.object({
  title: Joi.string().allow('', null).max(200).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
}).unknown(true)

export const displayModeSchema = Joi.object({
  mode: Joi.string().valid('force-on', 'force-off').required()
}).unknown(true)

export const heroSliderModeSchema = Joi.object({
  mode: Joi.string().valid('show', 'hide').required()
}).unknown(true)

export const banIpSchema = Joi.object({
  ip: Joi.string().ip().required()
}).unknown(true)

export const popupSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  body: Joi.string().min(1).max(5000).required(),
  startAt: Joi.alternatives().try(Joi.string(), Joi.date()).optional().allow('', null),
  endAt: Joi.alternatives().try(Joi.string(), Joi.date()).optional().allow('', null),
  dismissForDays: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  isActive: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  ctaLabel: Joi.string().allow('', null).max(100).optional(),
  ctaUrl: Joi.string().uri().allow('', null).optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  removeImage: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional()
}).unknown(true)

export const prPlanSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  displayOrder: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
}).unknown(true)

export const infographicSchema = Joi.object({
  title: Joi.string().allow('', null).max(200).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  displayOrder: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
}).unknown(true)

export const prPosterSchema = Joi.object({
  title: Joi.string().allow('', null).max(200).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional(),
  displayOrder: Joi.alternatives().try(Joi.number(), Joi.string()).optional()
}).unknown(true)

export const itaSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  parentId: Joi.alternatives().try(Joi.number(), Joi.string()).allow('', null).optional(),
  slug: Joi.string().allow('', null).optional(),
  content: Joi.string().allow('', null).optional(),
  pdfUrl: Joi.string().allow('', null).optional(),
  pdfFileId: Joi.alternatives().try(Joi.number(), Joi.string()).allow('', null).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional()
}).unknown(true)

const preventInjection = (value, helpers) => {
  const sqlPatterns = /('|(--)|(;)|(\|\|)|(\*)|union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|onerror|onload)/i
  if (sqlPatterns.test(value)) return helpers.error('any.invalid')
  return value
}

export const feedbackSchema = Joi.object({
  name: Joi.string().max(100).pattern(/^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()\-]+$/).custom(preventInjection).required(),
  email: Joi.string().email().max(255).allow('', null).optional(),
  phone: Joi.string().pattern(/^[0-9\s\-\(\)\+]+$/).max(20).allow('', null).optional(),
  subject: Joi.string().max(200).pattern(/^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()\-]+$/).custom(preventInjection).required(),
  message: Joi.string().max(5000).pattern(/^[\u0E00-\u0E7Fa-zA-Z0-9\s.,!?()\-@#%&*+=\n\r]+$/).custom(preventInjection).required()
}).unknown(true)

export const feedbackStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'read', 'replied', 'closed').required()
}).unknown(true)

export const feedbackReplySchema = Joi.object({
  reply: Joi.string().max(5000).required()
}).unknown(true)

export const unitSchema = Joi.object({
  name: Joi.string().max(255).required(),
  href: Joi.string().uri({ allowRelative: true }).allow('', null).optional(),
  link: Joi.string().uri({ allowRelative: true }).allow('', null).optional(),
  url: Joi.string().uri({ allowRelative: true }).allow('', null).optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  order: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  isPublished: Joi.alternatives().try(Joi.boolean(), Joi.number(), Joi.string().valid('true', 'false', '1', '0')).optional()
}).unknown(true)