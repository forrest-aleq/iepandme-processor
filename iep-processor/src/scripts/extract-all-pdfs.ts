import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { extractWithSchemaCompliance, SchemaCompliantIEPData, ApiUsage } from '../extractors/schema-compliant-extractor';

interface BatchExtractionResult {
  filename: string;
  success: boolean;
  extractedData?: SchemaCompliantIEPData;
  error?: string;
  processingTime: number;
  cost: number;
  tokens: number;
}

interface BatchSummary {
  totalFiles: number;
  successfulExtractions: number;
  failedExtractions: number;
  totalCost: number;
  totalTokens: number;
  totalProcessingTime: number;
  averageCostPerFile: number;
  averageTokensPerFile: number;
  averageTimePerFile: number;
  results: BatchExtractionResult[];
}

const PROGRESS_FILE = './batch_progress.json';
const RESULTS_DIR = './output/batch_results';

async function ensureResultsDirectory() {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
}

async function loadProgress(): Promise<string[]> {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      return progress.completedFiles || [];
    }
  } catch (error) {
    console.warn('Could not load progress file, starting fresh');
  }
  return [];
}

async function saveProgress(completedFiles: string[]) {
  const progress = {
    completedFiles,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function saveExtractionResult(filename: string, result: BatchExtractionResult) {
  await ensureResultsDirectory();
  const sanitizedFilename = path.basename(filename, '.pdf').replace(/[^a-zA-Z0-9-_]/g, '_');
  const outputPath = path.join(RESULTS_DIR, `${sanitizedFilename}_extraction.json`);
  
  const output = {
    sourceFile: filename,
    timestamp: new Date().toISOString(),
    success: result.success,
    processingTime: result.processingTime,
    cost: result.cost,
    tokens: result.tokens,
    extractedData: result.extractedData,
    error: result.error
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`   - Results saved to: ${outputPath}`);
}

export async function extractAllPDFs(
  resumeFromProgress: boolean = true,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<BatchSummary> {
  
  console.log('🚀 Starting batch extraction of all IEP PDFs...');
  console.log(`   - Reasoning effort: ${reasoningEffort}`);
  console.log(`   - Resume from progress: ${resumeFromProgress}`);
  
  // Find all PDF files
  const pdfFiles = await glob('./samples/*.pdf');
  console.log(`📁 Found ${pdfFiles.length} PDF files to process`);
  
  // Load progress if resuming
  const completedFiles = resumeFromProgress ? await loadProgress() : [];
  const remainingFiles = pdfFiles.filter(file => !completedFiles.includes(file));
  
  if (remainingFiles.length === 0) {
    console.log('✅ All files have already been processed!');
    return await generateSummary(pdfFiles);
  }
  
  console.log(`📋 Processing ${remainingFiles.length} remaining files...`);
  
  const results: BatchExtractionResult[] = [];
  let totalCost = 0;
  let totalTokens = 0;
  let totalTime = 0;
  
  for (let i = 0; i < remainingFiles.length; i++) {
    const file = remainingFiles[i];
    const fileName = path.basename(file);
    
    console.log(`\n📄 [${i + 1}/${remainingFiles.length}] Processing: ${fileName}`);
    
    const startTime = Date.now();
    
    try {
      const result = await extractWithSchemaCompliance(file, reasoningEffort);
      const processingTime = Date.now() - startTime;
      
      const batchResult: BatchExtractionResult = {
        filename: file,
        success: true,
        extractedData: result.data,
        processingTime,
        cost: result.usage?.cost_usd || 0,
        tokens: result.usage?.total_tokens || 0
      };
      
      results.push(batchResult);
      totalCost += batchResult.cost;
      totalTokens += batchResult.tokens;
      totalTime += processingTime;
      
      // Save individual result
      await saveExtractionResult(file, batchResult);
      
      // Update progress
      completedFiles.push(file);
      await saveProgress(completedFiles);
      
      console.log(`   ✅ Success! Cost: $${batchResult.cost.toFixed(6)}, Time: ${(processingTime/1000).toFixed(1)}s`);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const batchResult: BatchExtractionResult = {
        filename: file,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        cost: 0,
        tokens: 0
      };
      
      results.push(batchResult);
      
      // Save error result
      await saveExtractionResult(file, batchResult);
      
      console.log(`   ❌ Failed: ${batchResult.error}`);
    }
    
    // Rate limiting - wait between requests to avoid hitting limits
    if (i < remainingFiles.length - 1) {
      console.log('   ⏳ Waiting 3 seconds before next extraction...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Generate final summary
  const summary = await generateSummary(pdfFiles);
  
  console.log('\n🎉 Batch extraction completed!');
  console.log(`   - Total files: ${summary.totalFiles}`);
  console.log(`   - Successful: ${summary.successfulExtractions}`);
  console.log(`   - Failed: ${summary.failedExtractions}`);
  console.log(`   - Total cost: $${summary.totalCost.toFixed(6)}`);
  console.log(`   - Total time: ${(summary.totalProcessingTime/1000/60).toFixed(1)} minutes`);
  console.log(`   - Average cost per file: $${summary.averageCostPerFile.toFixed(6)}`);
  
  return summary;
}

async function generateSummary(allFiles: string[]): Promise<BatchSummary> {
  const results: BatchExtractionResult[] = [];
  let totalCost = 0;
  let totalTokens = 0;
  let totalTime = 0;
  let successCount = 0;
  
  // Load all individual results
  for (const file of allFiles) {
    const sanitizedFilename = path.basename(file, '.pdf').replace(/[^a-zA-Z0-9-_]/g, '_');
    const resultPath = path.join(RESULTS_DIR, `${sanitizedFilename}_extraction.json`);
    
    if (fs.existsSync(resultPath)) {
      try {
        const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        
        const result: BatchExtractionResult = {
          filename: file,
          success: resultData.success,
          extractedData: resultData.extractedData,
          error: resultData.error,
          processingTime: resultData.processingTime,
          cost: resultData.cost,
          tokens: resultData.tokens
        };
        
        results.push(result);
        
        if (result.success) {
          successCount++;
          totalCost += result.cost;
          totalTokens += result.tokens;
          totalTime += result.processingTime;
        }
      } catch (error) {
        console.warn(`Could not load result for ${file}`);
      }
    }
  }
  
  const summary: BatchSummary = {
    totalFiles: allFiles.length,
    successfulExtractions: successCount,
    failedExtractions: allFiles.length - successCount,
    totalCost,
    totalTokens,
    totalProcessingTime: totalTime,
    averageCostPerFile: successCount > 0 ? totalCost / successCount : 0,
    averageTokensPerFile: successCount > 0 ? totalTokens / successCount : 0,
    averageTimePerFile: successCount > 0 ? totalTime / successCount : 0,
    results
  };
  
  // Save summary
  const summaryPath = path.join(RESULTS_DIR, `batch_summary_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const reasoningEffort = (args.find(arg => arg.startsWith('--effort='))?.split('=')[1] as 'low' | 'medium' | 'high') || 'medium';
  const resume = !args.includes('--no-resume');
  
  extractAllPDFs(resume, reasoningEffort)
    .then(summary => {
      console.log('\n📊 Final Summary:');
      console.log(JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Batch extraction failed:', error);
      process.exit(1);
    });
}
