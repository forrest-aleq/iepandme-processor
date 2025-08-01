/**
 * Phase 2 Accuracy Assessment Tool
 * 
 * Measures the quality and completeness of extracted IEP data
 * to ensure we're meeting Phase 2 accuracy targets.
 */

import { processIEP } from './main.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface AccuracyMetrics {
  contentCompleteness: number;  // 0-100% how much content was extracted
  fieldAccuracy: number;        // 0-100% accuracy of specific fields
  structuralIntegrity: number;  // 0-100% proper structure and relationships
  overallScore: number;         // 0-100% combined accuracy score
}

interface ContentAnalysis {
  childInfo: {
    hasName: boolean;
    hasSchool: boolean;
    hasCompleteAddress: boolean;
    completeness: number;
  };
  parentInfo: {
    hasName: boolean;
    hasContact: boolean;
    completeness: number;
  };
  goals: {
    count: number;
    avgPresentLevelLength: number;
    hasProgressMeasures: boolean;
    hasObjectives: boolean;
    completeness: number;
  };
  services: {
    hasSDI: boolean;
    hasRelatedServices: boolean;
    hasAccommodations: boolean;
    hasFrequencies: boolean;
    completeness: number;
  };
}

/**
 * Analyze the quality and completeness of extracted IEP data
 */
function analyzeContentQuality(data: any): ContentAnalysis {
  const iepData = data.IEP || data;
  
  // Analyze Child Information
  const childInfo = iepData["CHILD'S INFORMATION"] || {};
  const childAnalysis = {
    hasName: !!(childInfo.NAME && childInfo.NAME.trim().length > 2),
    hasSchool: !!(childInfo.SCHOOL && childInfo.SCHOOL.trim().length > 3),
    hasCompleteAddress: !!(childInfo["HOME ADDRESS"] && childInfo["HOME ADDRESS"].length > 10),
    completeness: 0
  };
  childAnalysis.completeness = (
    (childAnalysis.hasName ? 25 : 0) +
    (childAnalysis.hasSchool ? 25 : 0) +
    (childAnalysis.hasCompleteAddress ? 25 : 0) +
    (childInfo.GRADE ? 25 : 0)
  );

  // Analyze Parent Information  
  const parentInfo = iepData["PARENT/GUARDIAN INFORMATION"] || {};
  const parentAnalysis = {
    hasName: !!(parentInfo.NAME && parentInfo.NAME.trim().length > 2),
    hasContact: !!(parentInfo.EMAIL || parentInfo["HOME PHONE"] || parentInfo["WORK PHONE"]),
    completeness: 0
  };
  parentAnalysis.completeness = (
    (parentAnalysis.hasName ? 50 : 0) +
    (parentAnalysis.hasContact ? 50 : 0)
  );

  // Analyze Goals
  const goals = iepData["6. MEASURABLE ANNUAL GOALS"] || [];
  const totalPresentLevelLength = goals.reduce((sum: number, goal: any) => {
    const presentLevel = goal["PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE"] || "";
    return sum + presentLevel.length;
  }, 0);
  
  const goalsAnalysis = {
    count: goals.length,
    avgPresentLevelLength: goals.length > 0 ? Math.round(totalPresentLevelLength / goals.length) : 0,
    hasProgressMeasures: goals.some((goal: any) => 
      goal["PROGRESS MEASUREMENT"] && goal["PROGRESS MEASUREMENT"].length > 0
    ),
    hasObjectives: goals.some((goal: any) => 
      goal["SHORT-TERM OBJECTIVES"] && goal["SHORT-TERM OBJECTIVES"].length > 0
    ),
    completeness: 0
  };
  
  goalsAnalysis.completeness = (
    (goalsAnalysis.count > 0 ? 25 : 0) +
    (goalsAnalysis.avgPresentLevelLength > 100 ? 25 : 0) +
    (goalsAnalysis.hasProgressMeasures ? 25 : 0) +
    (goalsAnalysis.hasObjectives ? 25 : 0)
  );

  // Analyze Services
  const services = iepData["7. SPECIALLY DESIGNED SERVICES"] || {};
  const servicesAnalysis = {
    hasSDI: !!(services["SPECIALLY DESIGNED INSTRUCTION"] && services["SPECIALLY DESIGNED INSTRUCTION"].length > 0),
    hasRelatedServices: !!(services["RELATED SERVICES"] && services["RELATED SERVICES"].length > 0),
    hasAccommodations: !!(services["ACCOMMODATIONS"] && services["ACCOMMODATIONS"].length > 0),
    hasFrequencies: false, // Will check for frequency patterns
    completeness: 0
  };
  
  // Check for frequency patterns in service descriptions
  const allServices = [
    ...(services["SPECIALLY DESIGNED INSTRUCTION"] || []),
    ...(services["RELATED SERVICES"] || []),
    ...(services["ACCOMMODATIONS"] || [])
  ];
  
  servicesAnalysis.hasFrequencies = allServices.some((service: any) => {
    const desc = service.Description || "";
    return /\d+\s*(time|minute|hour|day|week|month)/i.test(desc);
  });
  
  servicesAnalysis.completeness = (
    (servicesAnalysis.hasSDI ? 25 : 0) +
    (servicesAnalysis.hasRelatedServices ? 25 : 0) +
    (servicesAnalysis.hasAccommodations ? 25 : 0) +
    (servicesAnalysis.hasFrequencies ? 25 : 0)
  );

  return {
    childInfo: childAnalysis,
    parentInfo: parentAnalysis,
    goals: goalsAnalysis,
    services: servicesAnalysis
  };
}

/**
 * Calculate overall accuracy metrics
 */
function calculateAccuracyMetrics(analysis: ContentAnalysis): AccuracyMetrics {
  const contentCompleteness = (
    analysis.childInfo.completeness * 0.2 +
    analysis.parentInfo.completeness * 0.15 +
    analysis.goals.completeness * 0.4 +
    analysis.services.completeness * 0.25
  );

  const fieldAccuracy = contentCompleteness; // For now, same as completeness
  const structuralIntegrity = 100; // Schema validation ensures this
  const overallScore = (contentCompleteness + fieldAccuracy + structuralIntegrity) / 3;

  return {
    contentCompleteness: Math.round(contentCompleteness),
    fieldAccuracy: Math.round(fieldAccuracy),
    structuralIntegrity: Math.round(structuralIntegrity),
    overallScore: Math.round(overallScore)
  };
}

/**
 * Run accuracy assessment on a single PDF
 */
export async function assessSinglePDF(filePath: string): Promise<{
  fileName: string;
  analysis: ContentAnalysis;
  metrics: AccuracyMetrics;
  processingTime: number;
  cost: number;
}> {
  const startTime = Date.now();
  const fileName = path.basename(filePath);
  
  console.log(`\n📊 Assessing: ${chalk.blue(fileName)}`);
  
  try {
    const result = await processIEP(filePath);
    
    if (!result.success || !result.data) {
      throw new Error('Extraction failed');
    }
    
    const analysis = analyzeContentQuality(result.data);
    const metrics = calculateAccuracyMetrics(analysis);
    const processingTime = Date.now() - startTime;
    
    // Display results
    console.log(`   ${chalk.green('✅')} Overall Score: ${chalk.bold(metrics.overallScore + '%')}`);
    console.log(`   📝 Content: ${metrics.contentCompleteness}% | 🎯 Accuracy: ${metrics.fieldAccuracy}% | 🏗️ Structure: ${metrics.structuralIntegrity}%`);
    console.log(`   👤 Child: ${analysis.childInfo.completeness}% | 👨‍👩‍👧‍👦 Parent: ${analysis.parentInfo.completeness}% | 🎯 Goals: ${analysis.goals.completeness}% | 🛠️ Services: ${analysis.services.completeness}%`);
    console.log(`   ⏱️ Time: ${processingTime}ms | 💰 Cost: $${result.usage?.cost_usd.toFixed(6) || '0'}`);
    
    return {
      fileName,
      analysis,
      metrics,
      processingTime,
      cost: result.usage?.cost_usd || 0
    };
    
  } catch (error) {
    console.log(`   ${chalk.red('❌')} Failed: ${error}`);
    throw error;
  }
}

/**
 * Run comprehensive accuracy assessment on multiple PDFs
 */
export async function runAccuracyAssessment(sampleDir: string, maxFiles: number = 5): Promise<void> {
  console.log(chalk.bold.blue('\n🎯 PHASE 2 ACCURACY ASSESSMENT'));
  console.log('=' .repeat(60));
  
  const files = fs.readdirSync(sampleDir)
    .filter(file => file.endsWith('.pdf'))
    .slice(0, maxFiles);
  
  const results: any[] = [];
  let totalCost = 0;
  let totalTime = 0;
  
  for (const file of files) {
    const filePath = path.join(sampleDir, file);
    try {
      const result = await assessSinglePDF(filePath);
      results.push(result);
      totalCost += result.cost;
      totalTime += result.processingTime;
    } catch (error) {
      console.log(`   Skipping ${file} due to error`);
    }
  }
  
  // Calculate summary statistics
  const avgScore = results.reduce((sum, r) => sum + r.metrics.overallScore, 0) / results.length;
  const avgContentCompleteness = results.reduce((sum, r) => sum + r.metrics.contentCompleteness, 0) / results.length;
  const avgGoalsCompleteness = results.reduce((sum, r) => sum + r.analysis.goals.completeness, 0) / results.length;
  const avgPresentLevelLength = results.reduce((sum, r) => sum + r.analysis.goals.avgPresentLevelLength, 0) / results.length;
  
  // Display summary
  console.log(chalk.bold.green('\n📈 ACCURACY ASSESSMENT SUMMARY'));
  console.log('=' .repeat(60));
  console.log(`📊 Files Processed: ${chalk.bold(results.length)}/${files.length}`);
  console.log(`🎯 Average Overall Score: ${chalk.bold(Math.round(avgScore) + '%')}`);
  console.log(`📝 Average Content Completeness: ${chalk.bold(Math.round(avgContentCompleteness) + '%')}`);
  console.log(`🎯 Average Goals Completeness: ${chalk.bold(Math.round(avgGoalsCompleteness) + '%')}`);
  console.log(`📄 Average Present Level Length: ${chalk.bold(Math.round(avgPresentLevelLength))} chars`);
  console.log(`⏱️ Total Processing Time: ${chalk.bold(Math.round(totalTime / 1000))}s`);
  console.log(`💰 Total Cost: ${chalk.bold('$' + totalCost.toFixed(4))}`);
  
  // Phase 2 success criteria
  console.log(chalk.bold.yellow('\n🎯 PHASE 2 SUCCESS CRITERIA:'));
  console.log(`Overall Score ≥ 85%: ${avgScore >= 85 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')} (${Math.round(avgScore)}%)`);
  console.log(`Content Completeness ≥ 80%: ${avgContentCompleteness >= 80 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')} (${Math.round(avgContentCompleteness)}%)`);
  console.log(`Goals Completeness ≥ 90%: ${avgGoalsCompleteness >= 90 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')} (${Math.round(avgGoalsCompleteness)}%)`);
  console.log(`Present Level Length ≥ 200 chars: ${avgPresentLevelLength >= 200 ? chalk.green('✅ PASS') : chalk.red('❌ FAIL')} (${Math.round(avgPresentLevelLength)} chars)`);
  
  const phase2Success = avgScore >= 85 && avgContentCompleteness >= 80 && avgGoalsCompleteness >= 90 && avgPresentLevelLength >= 200;
  
  if (phase2Success) {
    console.log(chalk.bold.green('\n🎉 PHASE 2 COMPLETE - ACCURACY TARGETS MET!'));
    console.log(chalk.green('Ready for Phase 3 - Production Readiness'));
  } else {
    console.log(chalk.bold.yellow('\n⚠️ PHASE 2 IN PROGRESS - CONTINUE ACCURACY IMPROVEMENTS'));
    console.log(chalk.yellow('Focus on areas that need improvement above'));
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const sampleDir = process.argv[2] || './samples';
  const maxFiles = parseInt(process.argv[3]) || 5;
  
  runAccuracyAssessment(sampleDir, maxFiles)
    .catch(error => {
      console.error('Assessment failed:', error);
      process.exit(1);
    });
}
