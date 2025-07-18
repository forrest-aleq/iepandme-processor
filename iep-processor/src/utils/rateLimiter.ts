import { logger } from './logger.js';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  burstLimit: number;
  backoffMultiplier: number;
  maxRetries: number;
}

export class RateLimiter {
  private requestLog: number[] = [];
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig = {
    requestsPerMinute: 50,
    requestsPerDay: 10000,
    burstLimit: 10,
    backoffMultiplier: 2,
    maxRetries: 3
  }) {
    this.config = config;
  }
  
  async waitForAvailability(): Promise<void> {
    this.cleanupOldRequests();
    this.resetDailyCountIfNeeded();
    
    const now = Date.now();
    const recentRequests = this.requestLog.filter(time => now - time < 60000);
    
    // Check daily limit
    if (this.dailyRequestCount >= this.config.requestsPerDay) {
      const waitTime = this.getTimeUntilNextDay();
      logger.warn('Daily rate limit reached', {
        operation: 'rate_limit',
        dailyRequestCount: this.dailyRequestCount,
        waitTime
      });
      await this.sleep(waitTime);
      return this.waitForAvailability();
    }
    
    // Check per-minute limit
    if (recentRequests.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = 60000 - (now - oldestRequest);
      logger.warn('Per-minute rate limit reached', {
        operation: 'rate_limit',
        recentRequests: recentRequests.length,
        waitTime
      });
      await this.sleep(waitTime);
      return this.waitForAvailability();
    }
    
    // Check burst limit
    const burstWindow = 10000; // 10 seconds
    const burstRequests = this.requestLog.filter(time => now - time < burstWindow);
    if (burstRequests.length >= this.config.burstLimit) {
      const waitTime = burstWindow - (now - Math.min(...burstRequests));
      logger.warn('Burst rate limit reached', {
        operation: 'rate_limit',
        burstRequests: burstRequests.length,
        waitTime
      });
      await this.sleep(waitTime);
      return this.waitForAvailability();
    }
    
    // Record this request
    this.requestLog.push(now);
    this.dailyRequestCount++;
  }
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: any
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.waitForAvailability();
        
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        logger.info('Operation completed successfully', {
          ...context,
          attempt,
          duration
        });
        
        return result;
        
      } catch (error) {
        const processedError = error instanceof Error ? error : new Error(String(error));
        lastError = processedError;
        
        const errorMessage = processedError.message || '';
        const errorStatus = typeof error === 'object' && error !== null && 'status' in error ? 
          String(error.status) : undefined;
        
        const isRateLimit = errorMessage.includes('rate') || errorStatus === '429';
        const shouldRetry = attempt < this.config.maxRetries && isRateLimit;
        
        logger.error(`Operation failed (attempt ${attempt})`, processedError, {
          ...context,
          attempt,
          shouldRetry,
          errorCode: errorStatus
        });
        
        if (shouldRetry) {
          const backoffTime = Math.pow(this.config.backoffMultiplier, attempt - 1) * 1000;
          await this.sleep(backoffTime);
        }
      }
    }
    
    if (!lastError) {
      throw new Error('Operation failed with unknown error');
    }
    throw lastError;
  }
  
  private cleanupOldRequests(): void {
    const now = Date.now();
    this.requestLog = this.requestLog.filter(time => now - time < 60000);
  }
  
  private resetDailyCountIfNeeded(): void {
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = currentDate;
    }
  }
  
  private getTimeUntilNextDay(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - Date.now();
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}