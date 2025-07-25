import { extractWithO4MiniResponsesSmart } from './extractors/o4-mini-responses.js';
import path from 'path';

async function testResponsesAPI() {
  console.log('🧪 Testing o4-mini Responses API with direct file input...');
  
  const testFile = path.join(process.cwd(), 'samples', 'Carter Powell ReGeneration Middle School.pdf');
  
  try {
    console.log(`📄 Processing: ${testFile}`);
    
    const result = await extractWithO4MiniResponsesSmart(testFile, { 
      forceEffort: 'medium' 
    });
    
    console.log('✅ Success!');
    console.log(`📋 Student: ${result.data.studentInfo?.name || 'Unknown'}`);
    console.log(`🎯 Model: ${result.model}`);
    console.log(`🔢 Tokens: ${result.usage?.total_tokens || 0}`);
    console.log(`💰 Cost: $${result.usage?.cost_usd?.toFixed(4) || '0.0000'}`);
    
    if (result.usage?.reasoning_tokens) {
      console.log(`🧠 Reasoning tokens: ${result.usage.reasoning_tokens}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testResponsesAPI();
