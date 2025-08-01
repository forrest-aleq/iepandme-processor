import { extractWithFormSpecificCompliance } from './src/extractors/form-specific-extractor.ts';
import fs from 'fs';
import path from 'path';

const pdfPath = './samples/10389_Jayvyn_Bilbrew_20250606-174913.pdf';
console.log('🔍 Testing ENHANCED extraction with ALL sections...');

try {
  const result = await extractWithFormSpecificCompliance(pdfPath, 'medium');
  
  console.log('✅ Extraction completed');
  
  // Save with proper naming
  const outputPath = './output/1027_Carter_Powell_ENHANCED_EXTRACTION_2025-07-28.json';
  fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
  console.log('💾 Saved to:', outputPath);
  
  // Check what sections we got
  const iep = result.data?.IEP;
  if (iep) {
    console.log('\n📋 SECTIONS EXTRACTED:');
    Object.keys(iep).forEach(section => {
      console.log(`- ${section}: ${typeof iep[section] === 'object' ? 'OBJECT' : 'VALUE'}`);
    });
    
    // Check for the missing sections
    const missingSections = [
      '1. FUTURE PLANNING',
      '2. SPECIAL INSTRUCTIONAL FACTORS',
      '3. PROFILE',
      '8. TRANSPORTATION',
      '9. LEAST RESTRICTIVE ENVIRONMENT',
      '15. SIGNATURES'
    ];
    
    console.log('\n🔍 CHECKING CRITICAL SECTIONS:');
    missingSections.forEach(section => {
      console.log(`- ${section}: ${iep[section] ? '✅ PRESENT' : '❌ MISSING'}`);
    });
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
