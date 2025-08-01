#!/usr/bin/env node

/**
 * Simple test script for the form-specific IEP processor
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  console.log('🧪 Testing Form-Specific IEP Processor');
  console.log('Working directory:', process.cwd());

  try {
  // Import the main function
  console.log('📦 Importing processIEP function...');
  const { processIEP } = await import('./dist/main.js');
  console.log('✅ Successfully imported processIEP function');
  console.log('Function type:', typeof processIEP);

  // Check if schema file exists
  const schemaPath = path.join(__dirname, 'the_schema.json');
  if (fs.existsSync(schemaPath)) {
    console.log('✅ Schema file found at:', schemaPath);
  } else {
    console.log('❌ Schema file not found at:', schemaPath);
    process.exit(1);
  }

  // Find a sample PDF to test with
  const samplesDir = path.join(__dirname, 'samples');
  let testFile = null;
  
  if (fs.existsSync(samplesDir)) {
    const pdfFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      testFile = path.join(samplesDir, pdfFiles[0]);
      console.log('✅ Found test PDF:', pdfFiles[0]);
    } else {
      console.log('❌ No PDF files found in samples directory');
      process.exit(1);
    }
  } else {
    console.log('❌ Samples directory not found');
    process.exit(1);
  }

  // Test the extraction (only if OPENAI_API_KEY is set)
  if (process.env.OPENAI_API_KEY) {
    console.log('\n🚀 Running form-specific extraction test...');
    console.log('This may take 30-60 seconds...\n');
    
    const startTime = Date.now();
    
    processIEP(testFile, { 
      reasoningEffort: 'medium', 
      validateOutput: true,
      generateReport: false
    })
    .then(result => {
      const processingTime = Date.now() - startTime;
      
      console.log('\n✅ EXTRACTION COMPLETED SUCCESSFULLY!');
      console.log('─'.repeat(50));
      console.log('Success:', result.success);
      console.log('Processing time:', processingTime + 'ms');
      console.log('Cost:', '$' + (result.usage?.cost_usd || 0).toFixed(6));
      console.log('Model:', result.model);
      
      if (result.validation) {
        console.log('\n📋 VALIDATION RESULTS:');
        console.log('Valid:', result.validation.valid);
        console.log('Missing fields:', result.validation.missingFields.length);
        console.log('Type errors:', result.validation.incorrectTypes.length);
        console.log('Total errors:', result.validation.errors.length);
        
        if (!result.validation.valid) {
          console.log('\n❌ VALIDATION ISSUES FOUND:');
          if (result.validation.missingFields.length > 0) {
            console.log('First 3 missing fields:');
            result.validation.missingFields.slice(0, 3).forEach(field => {
              console.log('  -', field);
            });
          }
          if (result.validation.incorrectTypes.length > 0) {
            console.log('First 3 type errors:');
            result.validation.incorrectTypes.slice(0, 3).forEach(error => {
              console.log('  -', error);
            });
          }
        } else {
          console.log('🎉 PERFECT SCHEMA COMPLIANCE!');
        }
      }
      
      if (result.data) {
        console.log('\n📊 EXTRACTED DATA SUMMARY:');
        
        // Check the actual structure - data should be under IEP key
        const iepData = result.data.IEP || result.data;
        
        console.log('Has child info:', !!(iepData["CHILD'S INFORMATION"] && iepData["CHILD'S INFORMATION"].NAME));
        console.log('Has parent info:', !!(iepData["PARENT/GUARDIAN INFORMATION"] && iepData["PARENT/GUARDIAN INFORMATION"].NAME));
        console.log('Has goals:', !!(iepData["6. MEASURABLE ANNUAL GOALS"] && iepData["6. MEASURABLE ANNUAL GOALS"].length > 0));
        console.log('Has services:', !!(iepData["7. SPECIALLY DESIGNED SERVICES"]));
        console.log('Has amendments:', Array.isArray(iepData.AMENDMENTS));
        
        // Show actual sample data
        console.log('\n🔍 SAMPLE EXTRACTED CONTENT:');
        if (iepData["CHILD'S INFORMATION"]) {
          console.log('Child Name:', iepData["CHILD'S INFORMATION"].NAME || 'EMPTY');
          console.log('School:', iepData["CHILD'S INFORMATION"].SCHOOL || 'EMPTY');
        }
        if (iepData["6. MEASURABLE ANNUAL GOALS"] && iepData["6. MEASURABLE ANNUAL GOALS"].length > 0) {
          console.log('Goals Count:', iepData["6. MEASURABLE ANNUAL GOALS"].length);
          console.log('First Goal Area:', iepData["6. MEASURABLE ANNUAL GOALS"][0]["GOAL AREA"] || 'EMPTY');
          const presentLevel = iepData["6. MEASURABLE ANNUAL GOALS"][0]["PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE"] || '';
          console.log('Present Level Length:', presentLevel.length, 'chars');
        }
        
        // Show full structure for debugging
        console.log('\n🔧 DEBUG - Full Data Structure:');
        console.log(JSON.stringify(result.data, null, 2).substring(0, 1000) + '...');
      }
      
      console.log('\n🎯 PHASE 1 FORM-SPECIFIC RECONSTRUCTION: COMPLETE');
      console.log('Ready for Phase 2 - Accuracy Enhancement');
      
    })
    .catch(error => {
      console.error('\n❌ EXTRACTION FAILED:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
    
  } else {
    console.log('\n⚠️ OPENAI_API_KEY not set - skipping extraction test');
    console.log('✅ Import and validation setup successful');
    console.log('🎯 Ready for API testing when key is provided');
  }

} catch (error) {
  console.error('\n❌ TEST FAILED:');
  console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
