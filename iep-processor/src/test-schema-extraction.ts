import fs from 'fs';
import path from 'path';
import { extractWithSchemaCompliance } from './extractors/schema-compliant-extractor';
import { validateSchemaCompliance } from './validation/schema-validator';

async function testSchemaExtraction() {
  // Test with Carter Powell PDF first
  const testFile = './samples/Carter Powell ReGeneration Middle School.pdf';
  
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    return;
  }
  
  console.log('🧪 Testing Schema-Compliant IEP Extraction');
  console.log(`📄 File: ${testFile}`);
  console.log('');
  
  try {
    console.log('🔄 Starting extraction...');
    const startTime = Date.now();
    
    const result = await extractWithSchemaCompliance(testFile, 'medium');
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Extraction completed successfully!');
    console.log(`⏱️  Processing time: ${(processingTime/1000).toFixed(1)}s`);
    console.log(`💰 Cost: $${result.usage?.cost_usd?.toFixed(6) || 'N/A'}`);
    console.log(`🔢 Tokens: ${result.usage?.total_tokens || 'N/A'} (${result.usage?.reasoning_tokens || 0} reasoning)`);
    console.log('');
    
    // Validate schema compliance
    console.log('🔍 Validating schema compliance...');
    const validation = validateSchemaCompliance(result.data);
    
    console.log(`📊 Schema Compliance Score: ${validation.score}/100`);
    console.log(`✅ Valid: ${validation.valid}`);
    console.log(`📋 Total fields: ${validation.summary.totalFields}`);
    console.log(`✔️  Completed fields: ${validation.summary.completedFields}`);
    console.log('');
    
    // Show critical missing fields
    if (validation.summary.missingCriticalFields.length > 0) {
      console.log('🚨 Missing Critical Fields:');
      validation.summary.missingCriticalFields.forEach(field => {
        console.log(`   - ${field}`);
      });
      console.log('');
    }
    
    // Show validation issues
    if (validation.issues.length > 0) {
      console.log('⚠️  Validation Issues:');
      validation.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${issue.field}: ${issue.issue}`);
      });
      console.log('');
    }
    
    // Show extraction summary
    console.log('📋 Extraction Summary:');
    console.log(`   Student: ${result.data.student?.first_name} ${result.data.student?.last_name}`);
    console.log(`   School: ${result.data.student?.school}`);
    console.log(`   Grade: ${result.data.student?.grade}`);
    console.log(`   Student ID: ${result.data.student?.student_id}`);
    console.log(`   Goals: ${result.data.goals?.length || 0}`);
    console.log(`   Services: ${result.data.services?.length || 0}`);
    console.log(`   Accommodations: ${result.data.accommodations?.length || 0}`);
    console.log('');
    
    // Show detailed goal analysis
    if (result.data.goals && result.data.goals.length > 0) {
      console.log('🎯 Goals Analysis:');
      result.data.goals.forEach((goal, index) => {
        console.log(`   Goal ${index + 1}:`);
        console.log(`     Area: ${goal.area}`);
        console.log(`     Baseline length: ${goal.baseline?.length || 0} characters`);
        console.log(`     Objectives: ${goal.short_term_objectives?.length || 0}`);
        console.log(`     Measurement: ${goal.measurement_method || 'Not specified'}`);
      });
      console.log('');
    }
    
    // Show detailed service analysis
    if (result.data.services && result.data.services.length > 0) {
      console.log('🛠️  Services Analysis:');
      result.data.services.forEach((service, index) => {
        console.log(`   Service ${index + 1}:`);
        console.log(`     Type: ${service.type}`);
        console.log(`     Provider: ${service.provider_role}`);
        console.log(`     Frequency: ${service.frequency?.amount} ${service.frequency?.unit}`);
        console.log(`     Duration: ${service.duration_minutes} minutes`);
        console.log(`     Location: ${service.location}`);
      });
      console.log('');
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `./output/schema_test_${timestamp}.json`;
    
    const output = {
      sourceFile: testFile,
      timestamp: new Date().toISOString(),
      model: result.model,
      processingTime,
      usage: result.usage,
      validation,
      extractedData: result.data
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
    
    // Show present levels preview
    if (result.data.present_levels) {
      console.log('📖 Present Levels Preview:');
      if (result.data.present_levels.academic_achievement) {
        console.log(`   Academic: ${result.data.present_levels.academic_achievement.substring(0, 100)}...`);
      }
      if (result.data.present_levels.strengths) {
        console.log(`   Strengths: ${result.data.present_levels.strengths.substring(0, 100)}...`);
      }
      if (result.data.present_levels.needs) {
        console.log(`   Needs: ${result.data.present_levels.needs.substring(0, 100)}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSchemaExtraction()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testSchemaExtraction };
