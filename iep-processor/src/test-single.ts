import { processIEP } from './main';
import { FormSpecificIEPData } from './types/form-specific-iep-data';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { table } from 'table';

/**
 * Process a single IEP file and report on API usage costs
 */
async function testSingleFile(): Promise<void> {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log(chalk.red('❌ Please provide a file path'));
    console.log(chalk.cyan('Usage: npm run test:single <path-to-iep-file>'));
    console.log(chalk.cyan('Example: npm run test:single ./samples/sample_iep.pdf'));
    process.exit(1);
  }

  // Extract file information
  const fileName = filePath.split('/').pop() || filePath;
  const fileBaseName = fileName.split('.')[0];
  const fileType = fileName.split('.').pop() || 'txt';
  
  // Ensure output directory exists
  const outputDir = './output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Prepare output directory and filenames
  // Generate timestamp for unique filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = path.basename(filePath, path.extname(filePath));
  const jsonOutputPath = path.join(outputDir, `${baseName}_${timestamp}_extraction_result.json`);
  const costReportPath = path.join(outputDir, `${baseName}_${timestamp}_cost_report.txt`);
  
  console.log(chalk.blue.bold(`🧪 Processing IEP: ${fileName}`));
  console.log(chalk.gray(`   Output will be saved to: ${jsonOutputPath}`));

  // Show processing spinner
  const spinner = ora('Starting IEP processing pipeline...').start();
  const startTime = Date.now();

  try {    
    // Process the document
    spinner.text = '⚙️ Running IEP extraction (this may take 30-60 seconds)...';
    
    const result = await processIEP(filePath, { reasoningEffort: 'medium' });
    const processingTime = (Date.now() - startTime) / 1000;
    
    // Write results to file regardless of success/failure
    fs.writeFileSync(jsonOutputPath, JSON.stringify(result, null, 2));

    if (result.success) {
      // Save full extraction result to JSON file
      fs.writeFileSync(jsonOutputPath, JSON.stringify(result, null, 2));
      const processingTime = (Date.now() - startTime) / 1000;
      
      // Check if we encountered API errors
      const claudeFailed = !result.raw_results?.claude;
      const o4_miniFailed = !result.raw_results?.o4_mini;
      
      if (claudeFailed || o4_miniFailed) {
        console.log('\n' + chalk.red.bold('⚠️ API ERROR DETECTED:'));
        if (claudeFailed) {
          console.log(chalk.red('   - Claude API extraction failed. Check your API key or network connection.'));
        }
        if (o4_miniFailed) {
          console.log(chalk.red('   - OpenAI API extraction failed. Check your API key or network connection.'));
        }
        console.log(chalk.yellow('   Note: The extraction process continued with available model(s).'));
      }
      
      spinner.succeed(chalk.green(`✅ Extraction successful! (${processingTime.toFixed(1)}s)`));
      
      // Display API usage costs prominently
      console.log('\n' + chalk.blue.bold('💰 API USAGE COSTS:'));
      console.log(chalk.yellow('─'.repeat(50)));
      
      // Extract any cost data that might be available
      const o4_mini_cost = result.usage?.cost_usd || 'N/A';
      const o4_mini_tokens = result.usage?.total_tokens || 'N/A';
      
      // Claude doesn't provide cost directly, estimate based on tokens
      // Claude Opus pricing: ~$15 per million tokens input, ~$75 per million tokens output
      // This is an estimation - exact prices may vary
      
      // Create cost table
      const costData = [
        ['Model', 'Status', 'Tokens Used', 'Est. Cost (USD)'],
        [
          'Claude 4 Opus', 
          result.raw_results?.claude ? 'SUCCESS' : 'FAILED', 
          result.raw_results?.claude ? 'Not reported' : 'N/A',
          result.raw_results?.claude ? '~$5-10 (estimated)' : 'N/A'
        ],
        [
          'OpenAI o4_mini', 
          result.raw_results?.o4_mini ? 'SUCCESS' : 'FAILED', 
          typeof o4_mini_tokens === 'number' ? o4_mini_tokens.toLocaleString() : o4_mini_tokens,
          typeof o4_mini_cost === 'number' ? `$${o4_mini_cost.toFixed(4)}` : o4_mini_cost
        ]
      ];
      
      console.log(table(costData));
      
      // Summary stats
      console.log(chalk.cyan('\n📊 EXTRACTION SUMMARY:'));
      console.log(chalk.yellow('─'.repeat(50)));
      
      // Calculate stats from result data - ensure safe access with null/undefined checks
      const data = result.data || {} as FormSpecificIEPData; // Type assertion to make TypeScript happy
      const fieldStats = [
        ['Category', 'Found', 'Items'],
        ['Student Info', data.studentInfo ? 'YES' : 'NO', 'N/A'],
        ['Present Levels', data.presentLevels ? 'YES' : 'NO', 'N/A'],
        ['Goals', data.goals && data.goals.length > 0 ? 'YES' : 'NO', data.goals?.length || 0],
        ['Accommodations', data.accommodations && data.accommodations.length > 0 ? 'YES' : 'NO', data.accommodations?.length || 0],
        ['Services', data.services && data.services.length > 0 ? 'YES' : 'NO', data.services?.length || 0],
      ];
      
      console.log(table(fieldStats));
      
      // File output info
      console.log(chalk.cyan('\n📁 OUTPUT FILES:'));
      console.log(`   Full extraction data: ${jsonOutputPath}`);
      
      // Write cost report
      const costReport = `
========================================
IEP PROCESSING COST REPORT
========================================
File: ${fileName}
Date: ${new Date().toISOString()}

API USAGE:
-----------------------------------------
Claude 4 Opus: ${result.raw_results?.claude ? 'SUCCESS' : 'FAILED'}
OpenAI o4_mini: ${result.raw_results?.o4_mini ? 'SUCCESS' : 'FAILED'}

TOTAL TOKENS: ${typeof o4_mini_tokens === 'number' ? o4_mini_tokens.toLocaleString() : 'Not available'}
ESTIMATED COST: ${typeof o4_mini_cost === 'number' ? `$${o4_mini_cost.toFixed(4)}` : '~$5-10 (estimated)'}

PROCESSING TIME: ${processingTime.toFixed(2)} seconds
========================================
`;
      
      fs.writeFileSync(costReportPath, costReport);
      console.log(`   Cost report: ${costReportPath}`);
      
      // Validation summary
      const errorCount = result.metadata.validation?.errors.length || 0;
      const warningCount = result.metadata.validation?.warnings.length || 0;
      
      if (errorCount > 0 || warningCount > 0) {
        console.log(chalk.yellow(`\n⚠️ Validation: ${errorCount} errors, ${warningCount} warnings`));
        console.log('   See full output file for details');
      } else {
        console.log(chalk.green('\n✅ Validation: No errors or warnings'));
      }
      
    } else {
      spinner.fail(chalk.red('❌ Extraction failed'));
      console.log(chalk.red(`\nError: ${result.error}`));
    }

  } catch (error) {
    spinner.fail(chalk.red('❌ Exception occurred'));
    console.log(chalk.red(`\nException: ${(error as Error).message}`));
  }
}

testSingleFile();
