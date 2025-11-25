import winston from 'winston'
import path from 'path'
import fs from 'fs'

// Ensure logs directory exists (only in production)
const logsDir = path.join(process.cwd(), 'logs')
if (process.env.NODE_ENV === 'production' && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const isProd = process.env.NODE_ENV === 'production'

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ponghospital-api' },
  transports: [
    // In production, log to files
    ...(isProd ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'security.log'),
        level: 'warn',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ] : []),
    // Always log to console
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  // Handle exceptions and rejections (only in production)
  ...(isProd ? {
    exceptionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
    ]
  } : {})
})