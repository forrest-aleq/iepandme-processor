import { processIEP } from './dist/main.js';
import fs from 'fs';

const sampleFile = 'samples/10038_Al-Don_Wilks_20250620-181047.pdf';
console.log('🔍 Testing extraction with complete master schema...');

try {
  const result = await processIEP(sampleFile, { 
    reasoningEffort: 'medium',
    enableValidation: true 
  });
  
  console.log('📊 EXTRACTION RESULT:');
  console.log('Success:', result.success);
  console.log('Validation Valid:', result.validation?.valid);
  
  // Check what sections we actually extracted
  const iep = result.data?.IEP;
  if (iep) {
    console.log('\n🔍 EXTRACTED SECTIONS:');
    console.log('- CHILD INFO keys:', Object.keys(iep["CHILD'S INFORMATION"] || {}));
    console.log('- PARENT INFO keys:', Object.keys(iep["PARENT/GUARDIAN INFORMATION"] || {}));
    console.log('- Has MEETING INFORMATION:', !!iep['MEETING INFORMATION']);
    console.log('- Has IEP TIMELINES:', !!iep['IEP TIMELINES']);
    console.log('- Has FUTURE PLANNING:', !!iep['1. FUTURE PLANNING']);
    console.log('- Has SPECIAL FACTORS:', !!iep['2. SPECIAL INSTRUCTIONAL FACTORS']);
    console.log('- Has TRANSPORTATION:', !!iep['8. TRANSPORTATION']);
    console.log('- Has LRE:', !!iep['9. LEAST RESTRICTIVE ENVIRONMENT']);
    console.log('- Has SIGNATURES:', !!iep['15. SIGNATURES']);
    
    // Check goals structure
    const goals = iep['6. MEASURABLE ANNUAL GOALS'];
    console.log('\n🎯 GOALS STRUCTURE:');
    console.log('- Goals is array:', Array.isArray(goals));
    console.log('- Goals has wrapper object:', typeof goals === 'object' && !Array.isArray(goals));
    
    // Check services structure
    const services = iep['7. SPECIALLY DESIGNED SERVICES'];
    if (services && services['SPECIALLY DESIGNED INSTRUCTION'] && services['SPECIALLY DESIGNED INSTRUCTION'][0]) {
      const firstService = services['SPECIALLY DESIGNED INSTRUCTION'][0];
      console.log('\n🛠️ SERVICE STRUCTURE:');
      console.log('- Service keys:', Object.keys(firstService));
      console.log('- Has Provider Title:', !!firstService['Provider Title']);
      console.log('- Has Amount of Time:', !!firstService['Amount of Time']);
      console.log('- Has Frequency:', !!firstService['Frequency']);
    }
    
    // Save detailed output for analysis
    fs.writeFileSync('output/detailed-analysis.json', JSON.stringify(result.data, null, 2));
    console.log('\n📁 Detailed output saved to: output/detailed-analysis.json');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
