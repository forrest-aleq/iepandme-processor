#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { extractWithImprovedO4MiniResponses } from './extractors/improved-o4-mini-responses';

async function testImprovedExtraction() {
  const testFile = './samples/Carter Powell ReGeneration Middle School.pdf';
  
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }

  console.log('🧪 Testing Improved IEP Extraction');
  console.log('📄 File:', testFile);
  console.log('');

  try {
    const startTime = Date.now();
    
    console.log('🔄 Starting improved extraction...');
    const result = await extractWithImprovedO4MiniResponses(testFile, 'medium');
    
    const processingTime = Date.now() - startTime;
    
    console.log('');
    console.log('✅ Extraction completed successfully!');
    console.log(`⏱️  Processing time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`💰 Cost: $${result.usage?.cost || 'N/A'}`);
    console.log(`🔢 Tokens: ${result.usage?.totalTokens || 'N/A'}`);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `output/improved_extraction_${timestamp}.json`;
    
    const output = {
      sourceFile: testFile,
      processingTime,
      timestamp: new Date().toISOString(),
      model: result.model,
      usage: result.usage,
      extractedData: result.data
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`📄 Results saved to: ${outputFile}`);
    
    // Quick analysis
    console.log('');
    console.log('📊 QUICK ANALYSIS:');
    console.log(`   Student: ${result.data.studentInfo?.name || 'N/A'}`);
    console.log(`   Goals: ${result.data.goals?.length || 0}`);
    console.log(`   Accommodations: ${result.data.accommodations?.length || 0}`);
    console.log(`   Services: ${result.data.services?.length || 0}`);
    
    // Check for specific improvements
    if (result.data.goals && result.data.goals.length > 0) {
      const firstGoal = result.data.goals[0];
      console.log('');
      console.log('🔍 FIRST GOAL ANALYSIS:');
      console.log(`   Area: ${firstGoal.goalArea || 'N/A'}`);
      console.log(`   Baseline length: ${firstGoal.baseline?.length || 0} characters`);
      console.log(`   Has objectives: ${firstGoal.shortTermObjectives?.length || 0} items`);
      
      if (firstGoal.baseline) {
        console.log(`   Baseline preview: "${firstGoal.baseline.substring(0, 100)}..."`);
      }
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Run the test
testImprovedExtraction().catch(console.error);
