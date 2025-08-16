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
      // Save full extraction result to JSON file (already written above)
      spinner.succeed(chalk.green(`✅ Extraction successful! (${processingTime.toFixed(1)}s)`));
      
      // Display API usage costs prominently
      console.log('\n' + chalk.blue.bold('💰 API USAGE COSTS:'));
      console.log(chalk.yellow('─'.repeat(50)));
      
      // Extract usage and model information
      const modelName = result.model || 'unknown-model';
      const totalTokens = result.usage?.total_tokens ?? 'N/A';
      const estCost = result.usage?.cost_usd ?? 'N/A';
      const costData = [
        ['Model', 'Tokens Used', 'Est. Cost (USD)'],
        [
          modelName,
          typeof totalTokens === 'number' ? totalTokens.toLocaleString() : totalTokens,
          typeof estCost === 'number' ? `$${estCost.toFixed(4)}` : estCost
        ]
      ];
      
      console.log(table(costData));
      
      // Summary stats
      console.log(chalk.cyan('\n📊 EXTRACTION SUMMARY:'));
      console.log(chalk.yellow('─'.repeat(50)));
      
      // Calculate stats from result data using schema paths under data.IEP
      const data = (result.data || {}) as FormSpecificIEPData;
      const iep: any = (data as any).IEP || {};
      const studentInfoFound = Boolean(iep["CHILD'S INFORMATION"]);
      const goalsArray: any[] = (iep["6. MEASURABLE ANNUAL GOALS"]?.GOALS) || [];
      const services = iep["7. SPECIALLY DESIGNED SERVICES"] || {};
      const accommodationsArray: any[] = Array.isArray(services?.ACCOMMODATIONS) ? services.ACCOMMODATIONS : [];
      const serviceBuckets = [
        'SPECIALLY DESIGNED INSTRUCTION',
        'RELATED SERVICES',
        'ACCOMMODATIONS',
        'MODIFICATIONS'
      ];
      const servicesCount = serviceBuckets.reduce((sum, k) => sum + (Array.isArray(services?.[k]) ? services[k].length : 0), 0);
      const fieldStats = [
        ['Category', 'Found', 'Items'],
        ['Student Info', studentInfoFound ? 'YES' : 'NO', 'N/A'],
        ['Goals', goalsArray.length > 0 ? 'YES' : 'NO', goalsArray.length],
        ['Accommodations', accommodationsArray.length > 0 ? 'YES' : 'NO', accommodationsArray.length],
        ['Services (all)', servicesCount > 0 ? 'YES' : 'NO', servicesCount],
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
Model: ${modelName}

TOTAL TOKENS: ${typeof totalTokens === 'number' ? totalTokens.toLocaleString() : 'Not available'}
ESTIMATED COST: ${typeof estCost === 'number' ? `$${estCost.toFixed(4)}` : 'Not available'}

PROCESSING TIME: ${processingTime.toFixed(2)} seconds
========================================
`;
      
      fs.writeFileSync(costReportPath, costReport);
      console.log(`   Cost report: ${costReportPath}`);
      
      // Validation summary
      const errorCount = result.validation?.errors.length || 0;
      if (errorCount > 0) {
        console.log(chalk.yellow(`\n⚠️ Validation: ${errorCount} issues`));
        console.log('   See full output file for details');
      } else {
        console.log(chalk.green('\n✅ Validation: No issues'));
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
