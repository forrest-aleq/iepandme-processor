import { extractWithFormSpecificCompliance } from './src/extractors/form-specific-extractor.ts';
import fs from 'fs';
import path from 'path';

console.log('🚀 BATCH PROCESSING ALL IEP PDFs WITH OPTIMIZED SCHEMA');
console.log('=' .repeat(60));

// Create batch output directory
const batchOutputDir = './output/batch_optimized_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-');
if (!fs.existsSync(batchOutputDir)) {
  fs.mkdirSync(batchOutputDir, { recursive: true });
}
console.log(`📁 Batch outputs will be saved to: ${batchOutputDir}`);

// Get all PDF files from samples directory
const samplesDir = './samples';
const pdfFiles = fs.readdirSync(samplesDir)
  .filter(file => file.endsWith('.pdf'))
  .sort();

console.log(`📄 Found ${pdfFiles.length} PDF files to process`);
console.log('');

// Results tracking
const results = {
  successful: [],
  failed: [],
  retried: [],
  totalCost: 0,
  totalTokens: 0,
  startTime: new Date()
};

// Process each PDF with retry logic
for (let i = 0; i < pdfFiles.length; i++) {
  const pdfFile = pdfFiles[i];
  const pdfPath = path.join(samplesDir, pdfFile);
  
  console.log(`\n[${i + 1}/${pdfFiles.length}] Processing: ${pdfFile}`);
  console.log('-'.repeat(50));
  
  let success = false;
  let attempts = 0;
  const maxAttempts = 2;
  
  while (!success && attempts < maxAttempts) {
    attempts++;
    
    try {
      console.log(`   Attempt ${attempts}/${maxAttempts}...`);
      
      const result = await extractWithFormSpecificCompliance(pdfPath, 'medium');
      
      // Generate output filename based on student info
      const studentName = result.data.IEP["CHILD'S INFORMATION"].NAME || 'Unknown';
      const studentId = result.data.IEP["CHILD'S INFORMATION"]["ID NUMBER"] || 'NoID';
      const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      
      const outputFilename = `${studentId}_${cleanName}_OPTIMIZED_${timestamp}.json`;
      const outputPath = path.join(batchOutputDir, outputFilename);
      
      // Save extraction result
      fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
      
      // Track results
      results.successful.push({
        file: pdfFile,
        student: studentName,
        studentId: studentId,
        outputFile: outputFilename,
        cost: result.usage.cost_usd,
        tokens: result.usage.total_tokens,
        attempts: attempts
      });
      
      if (attempts > 1) {
        results.retried.push(pdfFile);
      }
      
      results.totalCost += result.usage.cost_usd;
      results.totalTokens += result.usage.total_tokens;
      
      console.log(`   ✅ SUCCESS: ${studentName} (${studentId})`);
      console.log(`   💾 Saved: ${outputFilename}`);
      console.log(`   💰 Cost: $${result.usage.cost_usd.toFixed(4)}`);
      console.log(`   🔢 Tokens: ${result.usage.total_tokens.toLocaleString()}`);
      
      success = true;
      
    } catch (error) {
      console.log(`   ❌ ATTEMPT ${attempts} FAILED: ${error.message}`);
      
      if (attempts >= maxAttempts) {
        results.failed.push({
          file: pdfFile,
          error: error.message,
          attempts: attempts
        });
        console.log(`   💀 FINAL FAILURE after ${attempts} attempts`);
      } else {
        console.log(`   🔄 Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // Progress update
  const processed = i + 1;
  const successCount = results.successful.length;
  const failCount = results.failed.length;
  const successRate = ((successCount / processed) * 100).toFixed(1);
  
  console.log(`\n📊 PROGRESS: ${processed}/${pdfFiles.length} processed | ${successCount} success | ${failCount} failed | ${successRate}% success rate`);
  console.log(`💰 Running cost: $${results.totalCost.toFixed(4)}`);
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('🏁 BATCH PROCESSING COMPLETE');
console.log('='.repeat(60));

const endTime = new Date();
const duration = Math.round((endTime - results.startTime) / 1000);
const minutes = Math.floor(duration / 60);
const seconds = duration % 60;

console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
console.log(`📄 Total PDFs: ${pdfFiles.length}`);
console.log(`✅ Successful: ${results.successful.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`🔄 Required retry: ${results.retried.length}`);
console.log(`📈 Success rate: ${((results.successful.length / pdfFiles.length) * 100).toFixed(1)}%`);
console.log(`💰 Total cost: $${results.totalCost.toFixed(4)}`);
console.log(`🔢 Total tokens: ${results.totalTokens.toLocaleString()}`);
console.log(`📁 Output directory: ${batchOutputDir}`);

// Save detailed results
const summaryPath = path.join(batchOutputDir, 'BATCH_SUMMARY.json');
fs.writeFileSync(summaryPath, JSON.stringify({
  ...results,
  endTime,
  duration: `${minutes}m ${seconds}s`,
  successRate: `${((results.successful.length / pdfFiles.length) * 100).toFixed(1)}%`,
  outputDirectory: batchOutputDir
}, null, 2));

console.log(`📋 Detailed summary saved: BATCH_SUMMARY.json`);

// List any failures
if (results.failed.length > 0) {
  console.log('\n❌ FAILED FILES:');
  results.failed.forEach(failure => {
    console.log(`   - ${failure.file}: ${failure.error}`);
  });
}

console.log('\n🎉 Batch processing complete!');
