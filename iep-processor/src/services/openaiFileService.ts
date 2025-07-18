import OpenAI from 'openai';
import fs from 'fs';
import { validateFileForOpenAI } from '../utils/fileValidation.js';
import { logger, LogContext } from '../utils/logger.js';
import { RateLimiter } from '../utils/rateLimiter.js';

// Define a custom error type for file operations
interface FileError {
  filePath: string;
  error: Error;
}

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
        await this.openai.files.delete(fileId);
      }, context);
      
      logger.info('File deleted successfully', context);
    } catch (error) {
      logger.warn('Failed to delete file', { ...context, error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  async getFileInfo(fileId: string): Promise<OpenAI.Files.FileObject> {
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
    const errors: FileError[] = [];
    
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
          const processedError = error instanceof Error ? error : new Error(String(error));
          errors.push({ filePath, error: processedError });
          // Use proper logger.error method signature with the error object as the second parameter
          const errorObj = error instanceof Error ? error : new Error(String(error));
          logger.error('Batch upload file failed', errorObj, {
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
      // Create formatted error messages for context
      const errorSummary = errors.map(e => `${e.filePath}: ${e.error.message}`).join('; ');
      
      logger.warn('Some files failed to upload', {
        ...context,
        errors: errorSummary
      });
    }
    
    return results;
  }
}