import winston from 'winston';

export interface LogContext {
  operation: string;
  fileId?: string;
  filePath?: string;
  fileSize?: number;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
  model?: string;
  confidence?: number;
  errorCode?: string;
  userId?: string;
  batchId?: string;
  error?: string;
  errors?: string;
  totalFiles?: number;
  dailyRequestCount?: number;
  successCount?: number;
  errorCount?: number;
  waitTime?: number;
  recentRequests?: number;
  burstRequests?: number;
}

class StructuredLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }
  
  info(message: string, context?: LogContext) {
    this.logger.info(message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.logger.error(message, { 
      ...context, 
      error: error?.message,
      stack: error?.stack,
      errorCode: context?.errorCode || error?.name
    });
  }
  
  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context);
  }
}

export const logger = new StructuredLogger();