/**
 * Main Entry Point for Form-Specific IEP Processing
 * 
 * This is the primary interface for processing IEP documents using the
 * form-specific extraction system. It combines extraction and validation
 * to ensure perfect schema compliance.
 * 
 * Features:
 * - Form-specific extraction using exact field names
 * - Comprehensive Ajv validation
 * - Detailed error reporting
 * - Cost tracking and usage statistics
 * - Proper error handling and cleanup
 */

import { extractWithFormSpecificCompliance } from './extractors/form-specific-extractor';
import { validateFormSpecificData, generateValidationReport } from './validation/ajv-validator';
import { FormSpecificIEPData, ApiUsage, ValidationResult } from './types/form-specific-iep-data';

/**
 * Processing options for IEP extraction
 */
export interface ProcessingOptions {
  reasoningEffort?: 'low' | 'medium' | 'high';
  validateOutput?: boolean;
  generateReport?: boolean;
}

/**
 * Complete processing result with extraction and validation
 */
export interface ProcessingResult {
  success: boolean;
  data?: FormSpecificIEPData;
  validation?: ValidationResult;
  usage?: ApiUsage;
  model?: string;
  error?: string;
  report?: string;
  processingTime?: number;
}

/**
 * Process an IEP document with form-specific extraction and validation
 * 
 * @param filePath - Path to the IEP PDF file
 * @param options - Processing options
 * @returns Promise with complete processing results
 */
export async function processIEP(
  filePath: string, 
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  
  const startTime = Date.now();
  
  console.log(`🚀 Starting form-specific IEP processing...`);
  console.log(`   File: ${filePath}`);
  console.log(`   Reasoning effort: ${options.reasoningEffort || 'medium'}`);
  console.log(`   Validation: ${options.validateOutput !== false ? 'enabled' : 'disabled'}`);
  
  try {
    // Step 1: Extract IEP data using form-specific schema
    console.log(`\n📊 Step 1: Form-specific extraction...`);
    const extractionResult = await extractWithFormSpecificCompliance(
      filePath, 
      options.reasoningEffort || 'medium'
    );
    
    console.log(`✅ Extraction completed successfully`);
    
    // Step 2: Validate extracted data (unless disabled)
    let validation: ValidationResult | undefined;
    if (options.validateOutput !== false) {
      console.log(`\n🔍 Step 2: Schema validation...`);
      validation = validateFormSpecificData(extractionResult.data);
      
      if (validation.valid) {
        console.log(`✅ Validation passed - perfect schema compliance`);
      } else {
        console.log(`⚠️ Validation issues found - see details below`);
      }
    }
    
    // Step 3: Generate report (if requested)
    let report: string | undefined;
    if (options.generateReport && validation) {
      console.log(`\n📋 Step 3: Generating validation report...`);
      report = generateValidationReport(validation);
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`\n🎉 Processing completed successfully!`);
    console.log(`   Processing time: ${processingTime}ms`);
    console.log(`   Total cost: $${extractionResult.usage?.cost_usd.toFixed(6) || 'unknown'}`);
    
    return {
      success: true,
      data: extractionResult.data,
      validation,
      usage: extractionResult.usage,
      model: extractionResult.model,
      report,
      processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Processing failed after ${processingTime}ms`);
    console.error(`   Error: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Process multiple IEP files in batch
 * 
 * @param filePaths - Array of file paths to process
 * @param options - Processing options
 * @returns Promise with array of processing results
 */
export async function processBatchIEPs(
  filePaths: string[],
  options: ProcessingOptions = {}
): Promise<ProcessingResult[]> {
  
  console.log(`🔄 Starting batch processing of ${filePaths.length} files...`);
  
  const results: ProcessingResult[] = [];
  let totalCost = 0;
  let successCount = 0;
  
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    console.log(`\n📄 Processing file ${i + 1}/${filePaths.length}: ${filePath}`);
    
    try {
      const result = await processIEP(filePath, options);
      results.push(result);
      
      if (result.success) {
        successCount++;
        totalCost += result.usage?.cost_usd || 0;
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}: ${error}`);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  console.log(`\n📊 Batch processing completed:`);
  console.log(`   Total files: ${filePaths.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${filePaths.length - successCount}`);
  console.log(`   Total cost: $${totalCost.toFixed(6)}`);
  
  return results;
}

/**
 * Validate an already extracted IEP data object
 * 
 * @param data - The extracted IEP data to validate
 * @returns Validation result
 */
export function validateIEPData(data: any): ValidationResult {
  return validateFormSpecificData(data);
}

/**
 * Quick validation check - returns just true/false
 * 
 * @param data - The extracted IEP data to validate
 * @returns True if valid, false otherwise
 */
export function isValidIEPData(data: any): boolean {
  const result = validateFormSpecificData(data);
  return result.valid;
}


