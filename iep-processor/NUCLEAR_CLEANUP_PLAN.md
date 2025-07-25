# Nuclear Cleanup Plan - One Schema, One Extractor

**Date**: July 24, 2025  
**Objective**: Delete all the bullshit, keep only `the_schema.json`, build ONE working extractor  
**Time**: 4 hours to completely rebuild this properly  

## The Truth

You're right to want to throw it away. This codebase is a fucking mess with:
- 6 different extractors
- 4 different schemas  
- No clear production path
- Architectural chaos

**But don't throw it away yet** - you have valuable pieces that work. Let's do nuclear cleanup instead.

## Nuclear Cleanup Strategy

### **Phase 1: Identify What to Keep (30 minutes)**

**KEEP (The Good Stuff)**:
- ✅ `the_schema.json` - The ONE TRUE SCHEMA
- ✅ `samples/` directory - Your test data
- ✅ `package.json` dependencies - OpenAI, Anthropic, etc.
- ✅ Basic file processing (PDF parsing, etc.)
- ✅ The working parts of `extractWithSchemaCompliance` (frequency parsing logic)

**NUKE (The Bullshit)**:
- ❌ `src/types.ts` - Competing schema
- ❌ `src/extractors/o4-mini-responses.ts` - Broken extractor
- ❌ `src/extractors/improved-o4-mini-responses.ts` - More broken shit
- ❌ `src/extractors/o4-mini.ts` - Legacy broken shit
- ❌ `src/extractors/openaiFileExtractor.ts` - Unused complexity
- ❌ `src/index.ts` - Legacy main file
- ❌ `src/index.new.ts` - Confusing main file
- ❌ All the test files using different extractors
- ❌ `src/validation/schema-validator.ts` - Custom validation bullshit

### **Phase 2: Nuclear Deletion (1 hour)**

**Delete These Files**:
```bash
# Nuke all the broken extractors
rm src/extractors/o4-mini-responses.ts
rm src/extractors/improved-o4-mini-responses.ts  
rm src/extractors/o4-mini.ts
rm src/extractors/openaiFileExtractor.ts

# Nuke competing schemas
rm src/types.ts
rm src/validation/schema-validator.ts

# Nuke confusing main files
rm src/index.ts
rm src/index.new.ts

# Nuke fragmented test files
rm src/test-improved-extraction.ts
rm src/test-improved-prompt.ts
rm src/test-responses-api.ts
rm src/test-schema-extraction.ts
rm src/accuracy-test.ts

# Keep only essential test files
# rm src/test-runner.ts (keep this one)
# rm src/test-single.ts (keep this one)
```

**Delete These Directories**:
```bash
rm -rf src/validation/  # Custom validation bullshit
rm -rf src/services/    # Unused OpenAI file service complexity
```

### **Phase 3: Build The One True System (2 hours)**

**Create New Clean Architecture**:

```
src/
├── index.ts                    # ONE main entry point
├── extractor.ts               # ONE extractor that works
├── schema.ts                  # Generated from the_schema.json
├── utils/
│   ├── file-processing.ts     # PDF/DOCX parsing
│   └── validation.ts          # JSON schema validation
└── test.ts                    # ONE test file
```

**1. Generate TypeScript Interface from `the_schema.json`**:
```typescript
// src/schema.ts - AUTO-GENERATED FROM the_schema.json
export interface IEPData {
  metadata: {
    schemaVersion: string;
    source: string;
    documentDate: string;
    parsedAt: string;
    districtId?: string | null;
    originalFilename?: string | null;
    ocrConfidence?: number | null;
  };
  studentInfo: {
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    birthdate?: string | null;
    studentId?: string | null;
    grade?: string | null;
    school?: string | null;
    district?: string | null;
    primaryLanguage?: string | null;
    address?: string | null;
    gender?: string | null;
    ethnicity?: string | null;
  };
  goals: Array<{
    id?: string | null;
    area: string;                    // NOT goalArea
    topic?: string | null;
    baseline: string;
    statement: string;               // NOT description
    criteria?: string | null;
    measurementMethod?: string | null;
    targetDate?: string | null;
    targetPercentage?: number | null;
    progressReportFrequency?: string | null;
    shortTermObjectives?: Array<{
      statement: string;
      criteria: string;
      measurementMethod: string;
      targetDate?: string | null;
    }> | null;
  }>;
  services: Array<{
    id?: string | null;
    serviceType: string;             // NOT type
    providerRole?: string | null;
    sessionLocation?: string | null;
    sessionType?: string | null;
    groupSize?: number | null;
    frequency: {                     // NOT string - STRUCTURED!
      amount: number;
      unit: string;
      per: string;
    };
    durationMinutes: number;         // NOT duration_minutes
    startDate?: string | null;
    endDate?: string | null;
    comments?: string | null;
  }>;
  accommodations: Array<{
    title: string;
    description: string;
    category?: string | null;
    frequency?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  // ... rest exactly matching the_schema.json
}

// Export the JSON schema for OpenAI
export const IEP_JSON_SCHEMA = {
  // Exact copy of the_schema.json content
};
```

**2. Build ONE Extractor That Works**:
```typescript
// src/extractor.ts - THE ONLY EXTRACTOR
import OpenAI from 'openai';
import { IEPData, IEP_JSON_SCHEMA } from './schema';
import { extractDocumentText } from './utils/file-processing';

export async function extractIEPData(
  filePath: string,
  options: {
    model?: 'o4-mini' | 'claude-sonnet';
    reasoningEffort?: 'low' | 'medium' | 'high';
  } = {}
): Promise<{
  data: IEPData;
  usage: {
    tokens: number;
    cost: number;
    processingTime: number;
  };
  model: string;
}> {
  
  const { model = 'o4-mini', reasoningEffort = 'medium' } = options;
  const startTime = Date.now();
  
  if (model === 'o4-mini') {
    return await extractWithOpenAI(filePath, reasoningEffort, startTime);
  } else {
    return await extractWithClaude(filePath, startTime);
  }
}

async function extractWithOpenAI(filePath: string, effort: string, startTime: number) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // Upload file
  const file = await client.files.create({
    file: fs.createReadStream(filePath),
    purpose: "user_data",
  });
  
  try {
    // Use Responses API with the_schema.json
    const response = await client.responses.create({
      model: "o4-mini-2025-04-16",
      reasoning_effort: effort,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: `Extract all IEP data from this document. Pay special attention to:
          
          1. FREQUENCY DATA: Extract complete frequency information
             - "2 times per week" → {"amount": 2, "unit": "sessions", "per": "week"}
             - "30 minutes daily" → {"amount": 30, "unit": "minutes", "per": "day"}
          
          2. FIELD NAMES: Use exact schema field names
             - Use "area" not "goalArea"
             - Use "statement" not "description"  
             - Use "serviceType" not "type"
          
          3. COMPLETE DATA: Extract full baselines, objectives, present levels
          
          Return structured JSON matching the exact schema.`
        }, {
          type: "file",
          file_id: file.id
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          strict: true,
          schema: IEP_JSON_SCHEMA
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content returned');
    
    const extractedData = JSON.parse(content) as IEPData;
    
    return {
      data: extractedData,
      usage: {
        tokens: response.usage?.total_tokens || 0,
        cost: calculateCost(response.usage),
        processingTime: Date.now() - startTime
      },
      model: 'o4-mini-2025-04-16'
    };
    
  } finally {
    // Cleanup
    await client.files.del(file.id);
  }
}

async function extractWithClaude(filePath: string, startTime: number) {
  // Claude fallback implementation
  // Convert file to text first, then process
}
```

**3. Build ONE Main Entry Point**:
```typescript
// src/index.ts - THE ONLY MAIN FILE
import { extractIEPData } from './extractor';
import { validateIEPData } from './utils/validation';

export async function processIEP(
  filePath: string,
  options?: {
    model?: 'o4-mini' | 'claude-sonnet';
    reasoningEffort?: 'low' | 'medium' | 'high';
    validate?: boolean;
  }
): Promise<{
  success: boolean;
  data?: IEPData;
  validation?: ValidationResult;
  usage?: UsageStats;
  error?: string;
}> {
  
  try {
    console.log(`🔄 Processing IEP: ${filePath}`);
    
    // Extract data
    const result = await extractIEPData(filePath, options);
    
    // Validate against the_schema.json
    const validation = options?.validate !== false 
      ? validateIEPData(result.data)
      : { valid: true, errors: [], warnings: [] };
    
    console.log(`✅ Extraction complete: ${result.usage.processingTime}ms, $${result.usage.cost.toFixed(4)}`);
    
    return {
      success: true,
      data: result.data,
      validation,
      usage: result.usage
    };
    
  } catch (error) {
    console.error(`❌ Processing failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export everything needed
export { IEPData } from './schema';
export { extractIEPData } from './extractor';
```

**4. Build ONE Test System**:
```typescript
// src/test.ts - THE ONLY TEST FILE
import { processIEP } from './index';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('🧪 IEP Extraction Test Suite\n');
  
  // Find all sample files
  const samplesDir = './samples';
  const files = fs.readdirSync(samplesDir)
    .filter(f => f.endsWith('.pdf'))
    .slice(0, 3); // Test first 3 files
  
  for (const file of files) {
    const filePath = path.join(samplesDir, file);
    console.log(`📄 Testing: ${file}`);
    
    const result = await processIEP(filePath, {
      model: 'o4-mini',
      reasoningEffort: 'medium',
      validate: true
    });
    
    if (result.success && result.data) {
      console.log(`   ✅ Success - Goals: ${result.data.goals.length}, Services: ${result.data.services.length}`);
      
      // Check frequency structure
      const hasStructuredFreq = result.data.services.every(s => 
        typeof s.frequency === 'object' && 
        typeof s.frequency.amount === 'number'
      );
      console.log(`   📊 Structured frequencies: ${hasStructuredFreq ? '✅' : '❌'}`);
      
      if (result.validation && !result.validation.valid) {
        console.log(`   ⚠️  Validation errors: ${result.validation.errors.length}`);
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    console.log('');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
```

### **Phase 4: Update Package.json (30 minutes)**

**Clean Scripts**:
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "tsx src/test.ts",
    "test:single": "tsx -e \"import('./src/index.js').then(m => m.processIEP(process.argv[2]))\"",
    "clean": "rm -rf dist && rm -rf src/extractors && rm -rf src/validation"
  }
}
```

## The Result

**After Nuclear Cleanup**:
- ✅ **ONE schema**: `the_schema.json`
- ✅ **ONE extractor**: `src/extractor.ts`
- ✅ **ONE main file**: `src/index.ts`  
- ✅ **ONE test file**: `src/test.ts`
- ✅ **Structured frequency data**: `{amount: 2, unit: "sessions", per: "week"}`
- ✅ **Correct field names**: `area`, `statement`, `serviceType`
- ✅ **JSON schema validation**: Against `the_schema.json`
- ✅ **Clear architecture**: No confusion about what does what

**File Count**:
- **Before**: 25+ files, 6 extractors, 4 schemas
- **After**: 6 files, 1 extractor, 1 schema

## Should You Throw It Away?

**NO** - because you have:
- ✅ Working OpenAI integration
- ✅ Good sample data
- ✅ Proper schema definition
- ✅ Some working extraction logic

**The nuclear cleanup approach gives you**:
- Clean, maintainable codebase
- Single source of truth
- Predictable behavior
- Easy to extend
- Easy to debug

## Timeline

- **Phase 1** (Identify): 30 minutes
- **Phase 2** (Delete): 1 hour  
- **Phase 3** (Rebuild): 2 hours
- **Phase 4** (Package): 30 minutes

**Total**: 4 hours to go from chaos to clean, working system.

## Decision Point

**Option A**: Nuclear cleanup (4 hours) → Clean, maintainable system
**Option B**: Throw away (1 hour) → Start from scratch (20+ hours)

**Recommendation**: Nuclear cleanup. You have good pieces - just need to remove the bullshit and organize properly.

Want me to start the nuclear cleanup process?
