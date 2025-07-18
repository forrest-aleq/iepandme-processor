import { processIEPDocument } from './index.new.js';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

interface ValidationResult {
  field: string;
  expected: any;
  actual: any;
  match: boolean;
  similarity?: number;
}

async function runQuickAccuracyTest(): Promise<void> {
  console.log(chalk.blue.bold('🎯 QUICK IEP ACCURACY TEST\n'));
  
  try {
    // Load ground truth
    console.log(chalk.cyan('📄 Loading validation schema...'));
    const validationData = JSON.parse(readFileSync('./validation.json', 'utf8'));
    
    // Extract from document (assuming Angel Sanchez IEP is in samples)
    console.log(chalk.cyan('🤖 Running AI extraction...'));
    const extractedResult = await processIEPDocument('./samples/angel_sanchez_iep.pdf', 'pdf');
    
    if (!extractedResult.success || !extractedResult.data) {
      console.log(chalk.red('❌ EXTRACTION FAILED:'), extractedResult.error);
      return;
    }
    
    const extracted = extractedResult.data;
    
    // Compare field by field
    console.log(chalk.blue.bold('\n📊 FIELD-BY-FIELD COMPARISON:\n'));
    
    const results: ValidationResult[] = [];
    
    // Student Info
    results.push(compareField('studentInfo.name', validationData.studentInfo.name, extracted.studentInfo?.name));
    results.push(compareField('studentInfo.school', validationData.studentInfo.school, extracted.studentInfo?.school));
    results.push(compareField('studentInfo.grade', validationData.studentInfo.grade, extracted.studentInfo?.grade));
    results.push(compareField('studentInfo.dob', validationData.studentInfo.dob, extracted.studentInfo?.dob));
    results.push(compareField('studentInfo.id', validationData.studentInfo.id, extracted.studentInfo?.id));
    
    // Parent/Guardian Info
    results.push(compareField('studentInfo.parent_guardian', validationData.studentInfo.parent_guardian, extracted.studentInfo?.parent_guardian));
    results.push(compareField('studentInfo.parent_contact', validationData.studentInfo.parent_contact, extracted.studentInfo?.parent_contact));
    
    // IEP Dates
    results.push(compareField('studentInfo.iep_date', validationData.studentInfo.iep_date, extracted.studentInfo?.iep_date));
    results.push(compareField('studentInfo.iep_review_date', validationData.studentInfo.iep_review_date, extracted.studentInfo?.iep_review_date));
    
    // Present Levels (text similarity)
    results.push(compareTextField('presentLevels.academics', validationData.presentLevels.academics, extracted.presentLevels?.academics));
    results.push(compareTextField('presentLevels.vocational', validationData.presentLevels.vocational, extracted.presentLevels?.vocational));
    
    // Goals Count
    results.push(compareField('goals.length', validationData.goals.length, extracted.goals?.length || 0));
    
    // Services Count
    results.push(compareField('services.length', validationData.services.length, extracted.services?.length || 0));
    
    // Accommodations Count
    results.push(compareField('accommodations.length', validationData.accommodations.length, extracted.accommodations?.length || 0));
    
    // Print results
    results.forEach(result => {
      const status = result.match ? chalk.green('✅') : chalk.red('❌');
      const similarity = result.similarity ? chalk.gray(`(${result.similarity}% similar)`) : '';
      
      console.log(`${status} ${result.field}`);
      console.log(chalk.gray(`   Expected: ${JSON.stringify(result.expected)}`));
      console.log(chalk.gray(`   Actual:   ${JSON.stringify(result.actual)} ${similarity}`));
      console.log('');
    });
    
    // Calculate overall accuracy
    const totalFields = results.length;
    const matchedFields = results.filter(r => r.match).length;
    const accuracy = Math.round((matchedFields / totalFields) * 100);
    
    console.log(chalk.blue.bold('📈 OVERALL RESULTS:'));
    console.log(chalk.cyan(`📊 Accuracy: ${accuracy}% (${matchedFields}/${totalFields} fields)`));
    console.log(chalk.cyan(`⏱️ Processing Time: ${extractedResult.metadata.processing_time}`));
    console.log(chalk.cyan(`🤖 Models: ${extractedResult.metadata.models_used?.join(', ')}`));
    
    if (accuracy >= 90) {
      console.log(chalk.green.bold('🎉 EXCELLENT! Ready for production!'));
    } else if (accuracy >= 70) {
      console.log(chalk.yellow.bold('⚠️ GOOD but needs improvement'));
    } else {
      console.log(chalk.red.bold('🚨 POOR - Significant work needed'));
    }
    
    // Save detailed results
    const detailedResults = {
      accuracy,
      totalFields,
      matchedFields,
      timestamp: new Date().toISOString(),
      fieldResults: results,
      extractedData: extracted,
      validationData: validationData
    };
    
    writeFileSync('./output/quick-accuracy-test.json', JSON.stringify(detailedResults, null, 2));
    console.log(chalk.blue('\n📄 Detailed results saved to ./output/quick-accuracy-test.json'));
    
  } catch (error) {
    console.log(chalk.red('❌ TEST FAILED:'), (error as Error).message);
  }
}

function compareField(fieldName: string, expected: any, actual: any): ValidationResult {
  const match = JSON.stringify(expected) === JSON.stringify(actual);
  return { field: fieldName, expected, actual, match };
}

function compareTextField(fieldName: string, expected: string, actual: string | undefined): ValidationResult {
  if (!actual) {
    return { field: fieldName, expected, actual, match: false, similarity: 0 };
  }
  
  const similarity = calculateTextSimilarity(expected.toLowerCase(), actual.toLowerCase());
  const match = similarity >= 70; // 70% similarity = match
  
  return { field: fieldName, expected, actual, match, similarity };
}

function calculateTextSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  const matchingWords = words1.filter(word => 
    words2.some(w2 => w2.includes(word) || word.includes(w2))
  ).length;
  
  return Math.round((matchingWords / Math.max(words1.length, words2.length)) * 100);
}

runQuickAccuracyTest();
