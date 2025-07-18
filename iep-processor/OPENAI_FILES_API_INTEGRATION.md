# OpenAI Files API Integration Guide

This document outlines how to implement OpenAI Files API best practices in the IEP processor to improve document handling and leverage native PDF processing capabilities.

## Current Implementation Issues

### Problems with Current Approach

- **Text-only processing**: Using local PDF parsing instead of OpenAI's native PDF capabilities
- **Missing Files API**: No file upload workflow with proper purpose values
- **No file validation**: Missing file size and format checks
- **Suboptimal accuracy**: Not leveraging OpenAI's document understanding features
- **Limited error tracking**: Basic error handling without structured logging
- **No batch optimization**: Processing files individually without bulk operations
- **Rate limiting gaps**: No protection against API usage spikes

### Benefits of Files API Integration

- **Better PDF understanding**: OpenAI processes both text and visual layout
- **Improved accuracy**: Native document structure recognition
- **File management**: Proper file lifecycle and cleanup
- **Cost optimization**: More efficient token usage for large documents
- **Enhanced monitoring**: Structured logging for better debugging
- **Batch efficiency**: Optimized processing for multiple files
- **Rate protection**: Built-in safeguards against API limits

## Implementation Plan

### Phase 1: File Upload and Validation

#### 1.1 Add File Size Validation
```typescript
// src/utils/fileValidation.ts
import fs from 'fs';

interface FileValidation {
  isValid: boolean;
  errors: string[];
  fileSizeInMB: number;
}

export function validateFileForOpenAI(filePath: string): FileValidation {
  const errors: string[] = [];
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { isValid: false, errors: ['File does not exist'], fileSizeInMB: 0 };
  }
  
  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  
  // OpenAI file size limits
  const MAX_SIZE_MB = 512;
  if (fileSizeInMB > MAX_SIZE_MB) {
    errors.push(`File size ${fileSizeInMB.toFixed(2)}MB exceeds OpenAI limit of ${MAX_SIZE_MB}MB`);
  }
  
  // Check file extension
  const ext = filePath.toLowerCase().split('.').pop();
  const supportedExtensions = ['pdf', 'docx', 'txt'];
  if (!ext || !supportedExtensions.includes(ext)) {
    errors.push(`Unsupported file type: ${ext}. Supported: ${supportedExtensions.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fileSizeInMB
  };
}
```

#### 1.2 Create Structured Logging Service

```typescript
// src/utils/logger.ts
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
```

#### 1.3 Create Rate Limiting Service

```typescript
// src/utils/rateLimiter.ts
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
    context: LogContext
  ): Promise<T> {
    let lastError: Error;
    
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
        lastError = error;
        const isRateLimit = error.message.includes('rate') || error.status === 429;
        const shouldRetry = attempt < this.config.maxRetries && isRateLimit;
        
        logger.error(`Operation failed (attempt ${attempt})`, error, {
          ...context,
          attempt,
          shouldRetry,
          errorCode: error.status?.toString()
        });
        
        if (shouldRetry) {
          const backoffTime = Math.pow(this.config.backoffMultiplier, attempt - 1) * 1000;
          await this.sleep(backoffTime);
        }
      }
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
```

#### 1.4 Create Enhanced File Upload Service

```typescript
// src/services/openaiFileService.ts
import OpenAI from 'openai';
import fs from 'fs';
import { validateFileForOpenAI } from '../utils/fileValidation.js';
import { logger, LogContext } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';

export class OpenAIFileService {
  private openai: OpenAI;
  private rateLimiter: RateLimiter;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.rateLimiter = new RateLimiter();
  }
  
  async uploadFile(filePath: string, purpose: 'user_data' = 'user_data'): Promise<string> {
    const context: LogContext = {
      operation: 'file_upload',
      filePath
    };
    
    // Validate file before upload
    const validation = validateFileForOpenAI(filePath);
    if (!validation.isValid) {
      const error = new Error(`File validation failed: ${validation.errors.join(', ')}`);
      logger.error('File validation failed', error, {
        ...context,
        fileSize: validation.fileSizeInMB,
        errorCode: 'VALIDATION_FAILED'
      });
      throw error;
    }
    
    context.fileSize = validation.fileSizeInMB;
    logger.info('Starting file upload', context);
    
    return await this.rateLimiter.executeWithRetry(async () => {
      const file = await this.openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: purpose
      });
      
      logger.info('File uploaded successfully', {
        ...context,
        fileId: file.id
      });
      
      return file.id;
    }, context);
  }
  
  async deleteFile(fileId: string): Promise<void> {
    const context: LogContext = {
      operation: 'file_delete',
      fileId
    };
    
    try {
      await this.rateLimiter.executeWithRetry(async () => {
        await this.openai.files.del(fileId);
      }, context);
      
      logger.info('File deleted successfully', context);
    } catch (error) {
      logger.warn('Failed to delete file', error, context);
    }
  }
  
  async getFileInfo(fileId: string): Promise<OpenAI.File> {
    const context: LogContext = {
      operation: 'file_info',
      fileId
    };
    
    return await this.rateLimiter.executeWithRetry(async () => {
      return await this.openai.files.retrieve(fileId);
    }, context);
  }
  
  async batchUploadFiles(filePaths: string[], purpose: 'user_data' = 'user_data'): Promise<string[]> {
    const batchId = `batch_${Date.now()}`;
    const context: LogContext = {
      operation: 'batch_upload',
      batchId
    };
    
    logger.info(`Starting batch upload of ${filePaths.length} files`, context);
    
    const results: string[] = [];
    const errors: Array<{ filePath: string, error: Error }> = [];
    
    // Process files with controlled concurrency
    const concurrency = 3; // Limit concurrent uploads
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const fileId = await this.uploadFile(filePath, purpose);
          results.push(fileId);
          return fileId;
        } catch (error) {
          errors.push({ filePath, error });
          logger.error('Batch upload file failed', error, {
            ...context,
            filePath
          });
          return null;
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + concurrency < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.info('Batch upload completed', {
      ...context,
      totalFiles: filePaths.length,
      successCount: results.length,
      errorCount: errors.length
    });
    
    if (errors.length > 0) {
      logger.warn('Some files failed to upload', undefined, {
        ...context,
        errors: errors.map(e => ({ filePath: e.filePath, error: e.error.message }))
      });
    }
    
    return results;
  }
}
```

### Phase 2: Enhanced PDF Processing

#### 2.1 Create PDF-Aware Extractor
```typescript
// src/extractors/openaiFileExtractor.ts
import OpenAI from 'openai';
import { OpenAIFileService } from '../services/openaiFileService.js';
import { IEPData } from '../types/iep.js';

export class OpenAIFileExtractor {
  private openai: OpenAI;
  private fileService: OpenAIFileService;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.fileService = new OpenAIFileService(apiKey);
  }
  
  async extractFromFile(filePath: string): Promise<{
    data: Partial<IEPData>;
    confidence: number;
    fileId: string;
    metadata: any;
  }> {
    let fileId: string | null = null;
    
    try {
      // Upload file to OpenAI
      fileId = await this.fileService.uploadFile(filePath);
      
      // Process with native PDF understanding
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Use vision-capable model for PDF processing
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: fileId
              },
              {
                type: "input_text",
                text: this.getIEPExtractionPrompt()
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "iep_extraction",
            strict: true,
            schema: this.getIEPSchema()
          }
        }
      });
      
      const extractedData = JSON.parse(response.choices[0].message.content);
      
      return {
        data: extractedData,
        confidence: this.calculateConfidence(extractedData),
        fileId,
        metadata: {
          model: "gpt-4o",
          tokensUsed: response.usage?.total_tokens || 0,
          processingTime: Date.now()
        }
      };
      
    } catch (error) {
      throw new Error(`File extraction failed: ${error.message}`);
    } finally {
      // Clean up uploaded file
      if (fileId) {
        await this.fileService.deleteFile(fileId);
      }
    }
  }
  
  private getIEPExtractionPrompt(): string {
    return `You are an expert at extracting information from IEP (Individualized Education Program) documents.

Analyze this IEP document and extract all relevant information. Pay special attention to:
- Document layout and structure
- Tables containing goals, accommodations, and services
- Visual elements like charts or diagrams
- Headers, footers, and form fields

Return the extracted data as structured JSON following the provided schema.`;
  }
  
  private getIEPSchema() {
    // Return the same schema used in existing extractors
    // This ensures consistency across different extraction methods
  }
  
  private calculateConfidence(data: Partial<IEPData>): number {
    // Implement confidence calculation based on completeness
    // Same logic as existing confidence calculation
  }
}
```

### Phase 3: Integration with Existing System

#### 3.1 Update Main Processing Function
```typescript
// src/index.ts - Add to existing extractors
import { OpenAIFileExtractor } from './extractors/openaiFileExtractor.js';

export async function processIEPDocument(filePath: string, fileType: string) {
  console.log(`Processing IEP document: ${filePath}`);
  
  const results: ExtractionResult[] = [];
  
  try {
    // Original text-based extraction (keep as fallback)
    const documentText = await extractDocumentText(filePath, fileType);
    
    // Add file-based extraction as primary method for PDFs
    if (fileType === 'pdf' && process.env.OPENAI_API_KEY) {
      try {
        console.log('Attempting file-based extraction with OpenAI...');
        const fileExtractor = new OpenAIFileExtractor(process.env.OPENAI_API_KEY);
        const fileResult = await fileExtractor.extractFromFile(filePath);
        
        results.push({
          model: 'openai-file',
          data: fileResult.data,
          confidence: fileResult.confidence,
          metadata: fileResult.metadata
        });
      } catch (error) {
        console.warn('File-based extraction failed, falling back to text extraction:', error.message);
      }
    }
    
    // Existing text-based extractors as fallback
    if (process.env.OPENAI_API_KEY) {
      const o4Result = await extractWithO4Mini(documentText);
      results.push(o4Result);
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      const claudeResult = await extractWithClaude4(documentText);
      results.push(claudeResult);
    }
    
    // Merge results with preference for file-based extraction
    const mergedResult = await mergeExtractionResults(results);
    
    return mergedResult;
    
  } catch (error) {
    throw new Error(`Document processing failed: ${error.message}`);
  }
}
```

#### 3.2 Enhanced Consensus Merging
```typescript
// Update mergeExtractionResults to prefer file-based extractions
function mergeExtractionResults(results: ExtractionResult[]): MergedResult {
  // Prioritize file-based extractions over text-based
  const sortedResults = results.sort((a, b) => {
    const aIsFile = a.model.includes('file');
    const bIsFile = b.model.includes('file');
    
    if (aIsFile && !bIsFile) return -1;
    if (!aIsFile && bIsFile) return 1;
    return b.confidence - a.confidence;
  });
  
  // Existing merge logic with file preference
  // ...
}
```

### Phase 4: Environment Configuration

#### 4.1 Update Environment Variables
```bash
# .env additions
OPENAI_API_KEY=sk-xxxxx
OPENAI_FILE_PROCESSING=true  # Feature flag for file-based processing
OPENAI_FILE_CLEANUP=true     # Auto-delete uploaded files
MAX_FILE_SIZE_MB=512         # File size limit
```

#### 4.2 Update Package Dependencies

```json
// package.json - ensure latest OpenAI SDK and logging
{
  "dependencies": {
    "openai": "^4.73.0",  // Latest version with Files API support
    "winston": "^3.11.0"  // Structured logging
  }
}
```

## Migration Strategy

### Step 1: Infrastructure Setup

- Add structured logging with Winston
- Implement rate limiting service
- Create file validation utilities
- Set up monitoring and log aggregation

### Step 2: Enhanced File Service

- Create OpenAI file service with logging integration
- Implement batch processing capabilities
- Add comprehensive error handling and retry logic
- Test with sample files

### Step 3: File-Based Extractor

- Implement PDF-aware extractor with structured logging
- Add performance monitoring and cost tracking
- Test against existing text-based extraction
- Compare accuracy and confidence scores

### Step 4: Integration and A/B Testing

- Update main processing function with feature flags
- Implement gradual rollout mechanism
- Run comparative testing with existing samples
- Monitor performance metrics and error rates

### Step 5: Production Optimization

- Fine-tune rate limiting parameters
- Implement advanced file cleanup strategies
- Set up alerting for API usage spikes
- Optimize batch processing concurrency

## Testing Approach

### Unit Tests

```typescript
// tests/fileValidation.test.ts
describe('File Validation', () => {
  test('should reject oversized files', () => {
    // Test file size validation
  });
  
  test('should accept valid PDF files', () => {
    // Test valid file acceptance
  });
});

// tests/rateLimiter.test.ts
describe('Rate Limiter', () => {
  test('should enforce per-minute limits', async () => {
    // Test rate limiting behavior
  });
  
  test('should implement exponential backoff', async () => {
    // Test retry logic
  });
});

// tests/logger.test.ts
describe('Structured Logger', () => {
  test('should log with proper context', () => {
    // Test logging functionality
  });
  
  test('should handle errors gracefully', () => {
    // Test error logging
  });
});

// tests/openaiFileService.test.ts
describe('OpenAI File Service', () => {
  test('should upload and delete files', async () => {
    // Test file lifecycle
  });
  
  test('should handle batch uploads efficiently', async () => {
    // Test batch processing
  });
  
  test('should respect rate limits', async () => {
    // Test rate limiting integration
  });
});
```

### Integration Tests

```typescript
// tests/fileBasedExtraction.test.ts
describe('File-Based Extraction', () => {
  test('should extract more accurate data than text-based', async () => {
    // Compare file vs text extraction
  });
  
  test('should handle PDF layout correctly', async () => {
    // Test layout preservation
  });
  
  test('should maintain structured logging throughout', async () => {
    // Test logging integration
  });
});

// tests/batchProcessing.test.ts
describe('Batch Processing', () => {
  test('should process multiple files efficiently', async () => {
    // Test batch operation performance
  });
  
  test('should handle partial failures gracefully', async () => {
    // Test error resilience
  });
  
  test('should respect concurrency limits', async () => {
    // Test controlled parallelism
  });
});
```

### Performance Tests

```typescript
// tests/performance.test.ts
describe('Performance Monitoring', () => {
  test('should track processing times accurately', async () => {
    // Test performance metrics
  });
  
  test('should monitor API usage and costs', async () => {
    // Test cost tracking
  });
  
  test('should detect rate limit issues', async () => {
    // Test rate limit monitoring
  });
});
```

## Expected Benefits

### Accuracy Improvements

- **Better table extraction**: Native PDF understanding preserves table structure
- **Layout awareness**: Maintains spatial relationships between elements
- **Visual element recognition**: Processes charts, diagrams, and form fields

### Performance Gains

- **Optimized token usage**: More efficient processing of structured documents
- **Reduced preprocessing**: Eliminates local PDF parsing overhead
- **Better error handling**: Native file format support with comprehensive logging

### Cost Optimization

- **Token efficiency**: Better context understanding reduces token waste
- **Processing speed**: Faster extraction with native PDF support
- **Reduced API calls**: Single call vs multiple text chunks
- **Rate limit compliance**: Prevents costly API usage spikes

### Operational Benefits

- **Enhanced debugging**: Structured logging provides detailed operation insights
- **Proactive monitoring**: Early detection of rate limits and errors
- **Batch efficiency**: Optimized processing for multiple files
- **Production readiness**: Comprehensive error handling and recovery

## Implementation Timeline

- **Week 1**: Infrastructure setup (logging, rate limiting, file validation)
- **Week 2**: Enhanced file service and batch processing
- **Week 3**: PDF-aware extractor development with monitoring
- **Week 4**: Integration, A/B testing, and performance optimization
- **Week 5**: Production deployment and monitoring setup

## Success Metrics

### Accuracy Metrics

- **Accuracy**: 10%+ improvement in extraction accuracy
- **Confidence**: 15%+ increase in average confidence scores
- **Table extraction**: 25%+ improvement in structured data extraction

### Performance Metrics

- **Processing time**: 20%+ reduction in per-document processing time
- **Batch efficiency**: 40%+ improvement in multi-file processing speed
- **Error rate**: 50%+ reduction in processing failures

### Operational Metrics

- **Cost efficiency**: Maintain or reduce per-document processing costs
- **Rate limit violations**: Zero rate limit violations in production
- **Mean time to resolution**: 60%+ faster debugging with structured logs
- **Uptime**: 99.9%+ availability with proper error handling

### Monitoring and Alerting

- **API usage tracking**: Real-time monitoring of token consumption
- **Error pattern detection**: Automated alerts for recurring issues
- **Performance degradation**: Early warning for processing slowdowns
- **Cost anomaly detection**: Alerts for unexpected API usage spikes

This implementation will bring the IEP processor in line with OpenAI Files API best practices while maintaining backward compatibility and improving overall extraction quality through enhanced error handling, batch processing capabilities, and comprehensive monitoring.
