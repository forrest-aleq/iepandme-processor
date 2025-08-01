/**
 * Sample PDF Validation Testing
 * 
 * This test suite validates that the form-specific extractor produces
 * output that perfectly matches the_schema.json with no missing or
 * mis-named fields. It tests against actual sample PDFs to ensure
 * real-world accuracy.
 * 
 * CRITICAL TESTS:
 * - All required fields are present
 * - No field names are mis-spelled or incorrectly cased
 * - AMENDMENTS array is handled correctly (even if empty)
 * - "Other (list)" fields are present in transition sections
 * - All 15 form sections are included
 * - Boolean checkboxes are properly extracted
 */

import { processIEP } from './main';
import { generateValidationReport } from './validation/ajv-validator';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Test result for a single PDF
 */
interface TestResult {
  fileName: string;
  success: boolean;
  validationPassed: boolean;
  missingFields: string[];
  incorrectTypes: string[];
  criticalIssues: string[];
  processingTime: number;
  cost: number;
  error?: string;
}

/**
 * Summary of all test results
 */
interface TestSummary {
  totalFiles: number;
  successfulExtractions: number;
  validationPassed: number;
  totalCost: number;
  averageProcessingTime: number;
  criticalIssues: string[];
}

/**
 * Run validation tests on sample PDFs
 * 
 * @param maxFiles - Maximum number of files to test (default: 5)
 * @param samplesDir - Directory containing sample PDFs
 */
export async function validateAllSamples(
  maxFiles: number = 5,
  samplesDir: string = './samples'
): Promise<TestSummary> {
  
  console.log(chalk.blue.bold(`\n🧪 FORM-SPECIFIC IEP VALIDATION TEST SUITE`));
  console.log(chalk.blue(`Testing up to ${maxFiles} sample PDFs for schema compliance\n`));
  
  // Find PDF files in samples directory
  let pdfFiles: string[] = [];
  try {
    pdfFiles = fs.readdirSync(samplesDir)
      .filter(file => file.endsWith('.pdf'))
      .slice(0, maxFiles);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to read samples directory: ${samplesDir}`));
    throw error;
  }
  
  if (pdfFiles.length === 0) {
    console.error(chalk.red(`❌ No PDF files found in ${samplesDir}`));
    throw new Error('No PDF files found for testing');
  }
  
  console.log(chalk.cyan(`Found ${pdfFiles.length} PDF files to test:`));
  pdfFiles.forEach((file, index) => {
    console.log(chalk.gray(`  ${index + 1}. ${file}`));
  });
  console.log('');
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Test each PDF file
  for (let i = 0; i < pdfFiles.length; i++) {
    const fileName = pdfFiles[i];
    const filePath = path.join(samplesDir, fileName);
    
    console.log(chalk.yellow(`\n📄 Testing ${i + 1}/${pdfFiles.length}: ${fileName}`));
    console.log(chalk.gray('─'.repeat(60)));
    
    const testStartTime = Date.now();
    
    try {
      // Process the IEP with validation enabled
      const result = await processIEP(filePath, {
        reasoningEffort: 'medium',
        validateOutput: true,
        generateReport: false
      });
      
      const processingTime = Date.now() - testStartTime;
      
      if (result.success && result.validation) {
        const validation = result.validation;
        
        // Analyze validation results
        const criticalIssues = identifyCriticalIssues(validation);
        
        const testResult: TestResult = {
          fileName,
          success: true,
          validationPassed: validation.valid,
          missingFields: validation.missingFields,
          incorrectTypes: validation.incorrectTypes,
          criticalIssues,
          processingTime,
          cost: result.usage?.cost_usd || 0
        };
        
        results.push(testResult);
        
        // Report results
        if (validation.valid) {
          console.log(chalk.green(`✅ VALIDATION PASSED`));
          console.log(chalk.green(`   All form fields match schema exactly`));
        } else {
          console.log(chalk.red(`❌ VALIDATION FAILED`));
          console.log(chalk.red(`   Missing fields: ${validation.missingFields.length}`));
          console.log(chalk.red(`   Type errors: ${validation.incorrectTypes.length}`));
          console.log(chalk.red(`   Total errors: ${validation.errors.length}`));
          
          // Show first few errors for debugging
          if (validation.missingFields.length > 0) {
            console.log(chalk.yellow(`   First missing fields:`));
            validation.missingFields.slice(0, 3).forEach(field => {
              console.log(chalk.yellow(`     - ${field}`));
            });
          }
          
          if (validation.incorrectTypes.length > 0) {
            console.log(chalk.yellow(`   First type errors:`));
            validation.incorrectTypes.slice(0, 3).forEach(error => {
              console.log(chalk.yellow(`     - ${error}`));
            });
          }
        }
        
        // Check for critical form-specific issues
        if (criticalIssues.length > 0) {
          console.log(chalk.red(`🚨 CRITICAL ISSUES FOUND:`));
          criticalIssues.forEach(issue => {
            console.log(chalk.red(`   - ${issue}`));
          });
        }
        
        console.log(chalk.cyan(`📊 Processing: ${processingTime}ms, Cost: $${(result.usage?.cost_usd || 0).toFixed(6)}`));
        
      } else {
        // Extraction failed
        const testResult: TestResult = {
          fileName,
          success: false,
          validationPassed: false,
          missingFields: [],
          incorrectTypes: [],
          criticalIssues: [],
          processingTime: Date.now() - testStartTime,
          cost: 0,
          error: result.error
        };
        
        results.push(testResult);
        
        console.log(chalk.red(`❌ EXTRACTION FAILED`));
        console.log(chalk.red(`   Error: ${result.error}`));
      }
      
    } catch (error) {
      const testResult: TestResult = {
        fileName,
        success: false,
        validationPassed: false,
        missingFields: [],
        incorrectTypes: [],
        criticalIssues: [],
        processingTime: Date.now() - testStartTime,
        cost: 0,
        error: error instanceof Error ? error.message : String(error)
      };
      
      results.push(testResult);
      
      console.log(chalk.red(`❌ TEST FAILED`));
      console.log(chalk.red(`   Exception: ${testResult.error}`));
    }
  }
  
  // Generate summary
  const totalTime = Date.now() - startTime;
  const summary = generateTestSummary(results, totalTime);
  
  // Display summary
  displayTestSummary(summary, results);
  
  return summary;
}

/**
 * Identify critical form-specific issues
 */
function identifyCriticalIssues(validation: any): string[] {
  const issues: string[] = [];
  
  // Check for missing AMENDMENTS array
  const amendmentErrors = validation.errors.filter((error: string) => 
    error.includes('AMENDMENTS') && error.includes('array')
  );
  if (amendmentErrors.length > 0) {
    issues.push('AMENDMENTS array missing or incorrect type');
  }
  
  // Check for missing "Other (list)" fields
  const otherListErrors = validation.errors.filter((error: string) => 
    error.includes('Other (list)')
  );
  if (otherListErrors.length > 0) {
    issues.push('"Other (list)" fields missing in transition sections');
  }
  
  // Check for missing main sections
  const mainSections = [
    "CHILD'S INFORMATION",
    "PARENT/GUARDIAN INFORMATION", 
    "6. MEASURABLE ANNUAL GOALS",
    "7. SPECIALLY DESIGNED SERVICES"
  ];
  
  for (const section of mainSections) {
    const sectionErrors = validation.missingFields.filter((field: string) => 
      field.includes(section)
    );
    if (sectionErrors.length > 0) {
      issues.push(`Missing required section: ${section}`);
    }
  }
  
  return issues;
}

/**
 * Generate test summary statistics
 */
function generateTestSummary(results: TestResult[], totalTime: number): TestSummary {
  const totalFiles = results.length;
  const successfulExtractions = results.filter(r => r.success).length;
  const validationPassed = results.filter(r => r.validationPassed).length;
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / totalFiles;
  
  // Collect all critical issues
  const criticalIssues: string[] = [];
  results.forEach(result => {
    result.criticalIssues.forEach(issue => {
      if (!criticalIssues.includes(issue)) {
        criticalIssues.push(issue);
      }
    });
  });
  
  return {
    totalFiles,
    successfulExtractions,
    validationPassed,
    totalCost,
    averageProcessingTime,
    criticalIssues
  };
}

/**
 * Display comprehensive test summary
 */
function displayTestSummary(summary: TestSummary, results: TestResult[]): void {
  console.log(chalk.blue.bold(`\n${'='.repeat(60)}`));
  console.log(chalk.blue.bold(`FORM-SPECIFIC VALIDATION TEST SUMMARY`));
  console.log(chalk.blue.bold(`${'='.repeat(60)}`));
  
  // Overall statistics
  console.log(chalk.cyan(`\n📊 OVERALL STATISTICS:`));
  console.log(`   Total files tested: ${summary.totalFiles}`);
  console.log(`   Successful extractions: ${summary.successfulExtractions}/${summary.totalFiles} (${((summary.successfulExtractions/summary.totalFiles)*100).toFixed(1)}%)`);
  console.log(`   Validation passed: ${summary.validationPassed}/${summary.totalFiles} (${((summary.validationPassed/summary.totalFiles)*100).toFixed(1)}%)`);
  console.log(`   Total cost: $${summary.totalCost.toFixed(6)}`);
  console.log(`   Average processing time: ${summary.averageProcessingTime.toFixed(0)}ms`);
  
  // Success/failure breakdown
  const successColor = summary.validationPassed === summary.totalFiles ? chalk.green : chalk.yellow;
  console.log(successColor(`\n🎯 VALIDATION RESULTS:`));
  
  if (summary.validationPassed === summary.totalFiles) {
    console.log(chalk.green(`   ✅ ALL TESTS PASSED - Perfect schema compliance!`));
  } else {
    console.log(chalk.yellow(`   ⚠️ ${summary.totalFiles - summary.validationPassed} files failed validation`));
    
    // Show failed files
    const failedFiles = results.filter(r => !r.validationPassed);
    failedFiles.forEach(result => {
      console.log(chalk.red(`     - ${result.fileName}: ${result.error || 'Validation errors'}`));
    });
  }
  
  // Critical issues
  if (summary.criticalIssues.length > 0) {
    console.log(chalk.red(`\n🚨 CRITICAL ISSUES FOUND:`));
    summary.criticalIssues.forEach(issue => {
      console.log(chalk.red(`   - ${issue}`));
    });
    console.log(chalk.yellow(`\n💡 These issues must be fixed before production deployment.`));
  } else {
    console.log(chalk.green(`\n✅ No critical form-specific issues found.`));
  }
  
  // Recommendations
  console.log(chalk.cyan(`\n💡 RECOMMENDATIONS:`));
  if (summary.validationPassed === summary.totalFiles) {
    console.log(chalk.green(`   🎉 Ready for Phase 2 - Accuracy Enhancement`));
  } else {
    console.log(chalk.yellow(`   🔧 Fix validation issues before proceeding to Phase 2`));
    console.log(chalk.yellow(`   📋 Review detailed error logs above`));
    console.log(chalk.yellow(`   🔍 Check field name spelling and capitalization`));
  }
  
  console.log(chalk.blue.bold(`\n${'='.repeat(60)}`));
}

/**
 * Run validation tests - main entry point
 */
async function main(): Promise<void> {
  try {
    await validateAllSamples(5, './samples');
  } catch (error) {
    console.error(chalk.red(`\n❌ Test suite failed: ${error}`));
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}


