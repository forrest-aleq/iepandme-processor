#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import { extractWithO4MiniResponses } from './extractors/o4-mini-responses';

async function testImprovedPrompt() {
  const testFile = './samples/Carter Powell ReGeneration Middle School.pdf';
  
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }

  console.log('🧪 Testing IEP Extraction with Current Working System');
  console.log('📄 File:', testFile);
  console.log('');

  try {
    const startTime = Date.now();
    
    console.log('🔄 Starting extraction...');
    const result = await extractWithO4MiniResponses(testFile, 'medium');
    
    const processingTime = Date.now() - startTime;
    
    console.log('');
    console.log('✅ Extraction completed successfully!');
    console.log(`⏱️  Processing time: ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`💰 Cost: $${result.usage?.cost || 'N/A'}`);
    console.log(`🔢 Tokens: ${result.usage?.totalTokens || 'N/A'}`);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `output/current_extraction_${timestamp}.json`;
    
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
    
    // Detailed analysis
    console.log('');
    console.log('📊 DETAILED ANALYSIS:');
    console.log(`   Student: ${result.data.studentInfo?.name || 'N/A'}`);
    console.log(`   School: ${result.data.studentInfo?.school || 'N/A'}`);
    console.log(`   Grade: ${result.data.studentInfo?.grade || 'N/A'}`);
    console.log(`   Goals: ${result.data.goals?.length || 0}`);
    console.log(`   Accommodations: ${result.data.accommodations?.length || 0}`);
    console.log(`   Services: ${result.data.services?.length || 0}`);
    
    // Check for specific issues mentioned in audit
    console.log('');
    console.log('🔍 AUDIT ISSUE ANALYSIS:');
    
    // Check goals for baseline completeness
    if (result.data.goals && result.data.goals.length > 0) {
      const firstGoal = result.data.goals[0];
      console.log(`   First Goal Area: ${firstGoal.goalArea || 'N/A'}`);
      console.log(`   Baseline length: ${firstGoal.baseline?.length || 0} characters`);
      console.log(`   Has objectives: ${firstGoal.shortTermObjectives?.length || 0} items`);
      
      if (firstGoal.baseline) {
        console.log(`   Baseline preview: "${firstGoal.baseline.substring(0, 150)}..."`);
      }
      
      // Check if baseline looks like it's truncated or incomplete
      if (firstGoal.baseline && firstGoal.baseline.length < 100) {
        console.log('   ⚠️  WARNING: Baseline appears short/incomplete');
      }
    }
    
    // Check accommodations for checkbox issue
    if (result.data.accommodations && result.data.accommodations.length > 0) {
      console.log(`   Sample accommodation: "${result.data.accommodations[0].description?.substring(0, 100)}..."`);
      
      // Look for signs of checkbox list extraction
      const hasMultipleGenericItems = result.data.accommodations.some(acc => 
        acc.description?.includes('Assessment') && 
        acc.description?.includes('Portfolios') &&
        acc.description?.includes('Observation')
      );
      
      if (hasMultipleGenericItems) {
        console.log('   ⚠️  WARNING: May be extracting checkbox lists instead of selected items');
      }
    }
    
    // Check services for frequency issues
    if (result.data.services && result.data.services.length > 0) {
      const firstService = result.data.services[0];
      console.log(`   Sample service: ${firstService.type} - ${firstService.frequency}`);
      
      if (firstService.frequency?.includes('per week') && !firstService.frequency.match(/\d/)) {
        console.log('   ⚠️  WARNING: Service frequency missing numbers');
      }
    }
    
    // Check present levels
    if (result.data.presentLevels) {
      const academicsLength = result.data.presentLevels.academics?.length || 0;
      console.log(`   Present Levels - Academics length: ${academicsLength} characters`);
      
      if (academicsLength < 200) {
        console.log('   ⚠️  WARNING: Present levels may be incomplete');
      }
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Run the test
testImprovedPrompt().catch(console.error);
