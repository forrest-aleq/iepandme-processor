import { processIEPDocument, type ProcessingResult } from './index.new.js';
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface TestResult {
  file: string;
  success: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
  processingTime: number;
  studentName?: string;
  goalsCount: number;
  accommodationsCount: number;
  servicesCount: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
}

async function runTests(): Promise<void> {
  console.log(chalk.blue.bold('🧪 IEP Extraction Accuracy Test Suite\n'));

  // Ensure output directory exists
  try {
    mkdirSync('./output', { recursive: true });
  } catch (error) {
    // Directory already exists
  }

  // Find all test files
  const samplesDir = './samples';
  const testFiles: string[] = [];

  try {
    const files = readdirSync(samplesDir);
    files.forEach(file => {
      const filePath = join(samplesDir, file);
      if (statSync(filePath).isFile() && 
          (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.txt'))) {
        testFiles.push(filePath);
      }
    });
  } catch (error) {
    console.log(chalk.yellow('📁 No samples directory found. Creating one...'));
    console.log(chalk.cyan('   Place your IEP files in ./samples/ directory'));
    console.log(chalk.cyan('   Supported formats: PDF, DOCX, TXT\n'));
    return;
  }

  if (testFiles.length === 0) {
    console.log(chalk.yellow('📄 No test files found in ./samples/'));
    console.log(chalk.cyan('   Place your IEP files in ./samples/ directory\n'));
    return;
  }

  console.log(chalk.green(`Found ${testFiles.length} test file(s):\n`));
  testFiles.forEach((file, i) => {
    console.log(chalk.gray(`${i + 1}. ${file}`));
  });
  console.log('');

  const results: TestResult[] = [];
  let totalTime = 0;

  // Process files concurrently for better performance
  console.log(chalk.blue('🚀 Processing files concurrently...\n'));
  
  const processPromises = testFiles.map(async (filePath, index) => {
    const fileName = filePath.split('/').pop() || filePath;
    const fileType = fileName.split('.').pop() || 'txt';
    
    const spinner = ora(`Processing ${fileName}...`).start();
    const startTime = Date.now();
    
    // Generate unique timestamp for each file (add index to ensure uniqueness)
    const baseTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const uniqueTimestamp = `${baseTimestamp}_${index.toString().padStart(3, '0')}`;

    try {
      const result = await processIEPDocument(filePath, fileType);
      const processingTime = Date.now() - startTime;

      // Save detailed results to JSON file with timestamp for uniqueness
      const outputFileName = `${fileName.replace(/\.[^/.]+$/, '')}_extraction_result_${uniqueTimestamp}.json`;
      const outputPath = join('./output', outputFileName);
      
      const detailedOutput = {
        sourceFile: fileName,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        success: result.success,
        extractedData: result.data || null,
        metadata: result.metadata,
        rawResults: result.raw_results || null,
        usage: result.usage || null,
        error: result.error || null
      };

      writeFileSync(outputPath, JSON.stringify(detailedOutput, null, 2));

      if (result.success && result.data) {
        spinner.succeed(chalk.green(`✅ ${fileName} - Success`));
        
        const testResult: TestResult = {
          file: fileName,
          success: true,
          confidence: result.metadata.claude_confidence || result.metadata.o4_mini_confidence || 0,
          errors: result.metadata.validation?.errors || [],
          warnings: result.metadata.validation?.warnings || [],
          processingTime,
          studentName: result.data.studentInfo?.name,
          goalsCount: result.data.goals?.length || 0,
          accommodationsCount: result.data.accommodations?.length || 0,
          servicesCount: result.data.services?.length || 0,
          usage: result.usage
        };

        // Display enhanced extraction data
        console.log(chalk.gray(`   📋 Student: ${result.data.studentInfo?.name || 'Unknown'}`));
        console.log(chalk.gray(`   📊 Data: ${result.data.goals?.length || 0} goals, ${result.data.accommodations?.length || 0} accommodations, ${result.data.services?.length || 0} services`));
        console.log(chalk.gray(`   ⏱️  Time: ${processingTime}ms`));
        
        // Display token usage and costs
        if (result.usage) {
          console.log(chalk.blue(`   🔮 API Usage: ${result.usage.total_tokens.toLocaleString()} tokens ($${result.usage.cost_usd.toFixed(4)})`));
        }
        
        console.log(chalk.blue(`   📄 Saved to: ${outputPath}\n`));

        return testResult;

      } else {
        spinner.fail(chalk.red(`❌ ${fileName} - Failed`));
        
        const testResult: TestResult = {
          file: fileName,
          success: false,
          confidence: 0,
          errors: [result.error || 'Unknown error'],
          warnings: [],
          processingTime,
          goalsCount: 0,
          accommodationsCount: 0,
          servicesCount: 0,
          usage: result.usage
        };

        console.log(chalk.red(`   Error: ${result.error}`));
        console.log(chalk.blue(`   📄 Error details saved to: ${outputPath}\n`));
        
        return testResult;
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Save error details to JSON file with timestamp for uniqueness
      const outputFileName = `${fileName.replace(/\.[^/.]+$/, '')}_extraction_error_${uniqueTimestamp}.json`;
      const outputPath = join('./output', outputFileName);
      
      const errorOutput = {
        sourceFile: fileName,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: (error as Error).message,
        stackTrace: (error as Error).stack
      };

      writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));

      spinner.fail(chalk.red(`❌ ${fileName} - Exception`));
      
      const testResult: TestResult = {
        file: fileName,
        success: false,
        confidence: 0,
        errors: [(error as Error).message],
        warnings: [],
        processingTime,
        goalsCount: 0,
        accommodationsCount: 0,
        servicesCount: 0
      };

      console.log(chalk.red(`   Exception: ${(error as Error).message}`));
      console.log(chalk.blue(`   📄 Error details saved to: ${outputPath}\n`));
      
      return testResult;
    }
  });

  // Wait for all files to process
  const processResults = await Promise.all(processPromises);
  results.push(...processResults);
  totalTime = processResults.reduce((sum, result) => sum + result.processingTime, 0);

  // Print enhanced summary
  printEnhancedTestSummary(results, totalTime);
  
  // Save test summary to output directory
  const summaryOutput = {
    testSummary: {
      totalFiles: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      avgConfidence: results.filter(r => r.success).reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.success).length || 0,
      totalProcessingTime: totalTime,
      totalCost: results.reduce((sum, r) => sum + (r.usage?.cost_usd || 0), 0),
      avgCostPerFile: results.length > 0 ? results.reduce((sum, r) => sum + (r.usage?.cost_usd || 0), 0) / results.length : 0
    },
    detailedResults: results,
    timestamp: new Date().toISOString()
  };
  
  const summaryTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const summaryFileName = `test_summary_${summaryTimestamp}.json`;
  writeFileSync(`./output/${summaryFileName}`, JSON.stringify(summaryOutput, null, 2));
  console.log(chalk.blue(`\n📄 Test summary saved to: ./output/${summaryFileName}`));
}

function printEnhancedTestSummary(results: TestResult[], totalTime: number): void {
  console.log(chalk.blue.bold('📊 Enhanced Test Summary\n'));

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  const avgConfidence = results.filter(r => r.success).reduce((sum, r) => sum + r.confidence, 0) / successCount || 0;
  
  // Calculate usage statistics
  const totalCost = results.reduce((sum, r) => sum + (r.usage?.cost_usd || 0), 0);
  const avgCostPerFile = results.length > 0 ? totalCost / results.length : 0;
  const totalTokens = results.reduce((sum, r) => {
    return sum + (r.usage?.total_tokens || 0);
  }, 0);

  console.log(chalk.green(`✅ Successful extractions: ${successCount}/${results.length}`));
  console.log(chalk.red(`❌ Failed extractions: ${failureCount}/${results.length}`));
  console.log(chalk.cyan(`📈 Average confidence: ${avgConfidence.toFixed(1)}%`));
  console.log(chalk.gray(`⏱️  Total processing time: ${(totalTime / 1000).toFixed(2)}s (avg: ${(totalTime / results.length / 1000).toFixed(2)}s per file)`));
  console.log(chalk.green(`💰 Total cost: $${totalCost.toFixed(4)} (avg: $${avgCostPerFile.toFixed(4)} per file)`));
  console.log(chalk.blue(`🔢 Total tokens processed: ${totalTokens.toLocaleString()}`));
  console.log('');

  // Enhanced detailed results table
  if (results.length > 0) {
    console.log(chalk.blue.bold('📋 Detailed Results:\n'));
    
    results.forEach(result => {
      const status = result.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      const confidence = result.success ? chalk.cyan(`${result.confidence}%`) : chalk.gray('N/A');
      
      console.log(`${status} ${result.file}`);
      console.log(`   Confidence: ${confidence} | Time: ${result.processingTime}ms`);
      console.log(`   Student: ${result.studentName || 'Not extracted'}`);
      console.log(`   Data: ${result.goalsCount} goals, ${result.accommodationsCount} accommodations, ${result.servicesCount} services`);
      
      if (result.usage) {
        console.log(chalk.blue(`   Usage: ${result.usage.total_tokens.toLocaleString()}tok ($${result.usage.cost_usd.toFixed(4)})`));
      }
      
      if (result.errors.length > 0) {
        console.log(chalk.red(`   Errors: ${result.errors.join(', ')}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow(`   Warnings: ${result.warnings.join(', ')}`));
      }
      
      console.log('');
    });
  }

  // Enhanced recommendations
  console.log(chalk.blue.bold('💡 Enhanced Recommendations:\n'));
  
  if (avgConfidence < 70) {
    console.log(chalk.yellow('⚠️  Low average confidence - consider improving prompts or document quality'));
  }
  
  if (failureCount > 0) {
    console.log(chalk.yellow('⚠️  Some extractions failed - check API keys and document formats'));
  }
  
  if (totalCost > 1.0) {
    console.log(chalk.yellow(`⚠️  High cost per batch ($${totalCost.toFixed(2)}) - consider optimizing prompts or using cheaper models for testing`));
  }
  
  if (successCount === results.length && avgConfidence > 80) {
    console.log(chalk.green('🎉 Excellent results! Ready for production deployment.'));
  }

  if (totalTime / results.length > 30000) { // 30+ seconds per file
    console.log(chalk.yellow('⚠️  Slow processing - consider optimizing document size or switching to concurrent processing'));
  } else {
    console.log(chalk.green(`⚡ Good performance: ${(totalTime / results.length / 1000).toFixed(1)}s average per file`));
  }
}

// Run tests
runTests().catch(console.error);
