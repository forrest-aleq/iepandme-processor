# Schema-Based IEP Extraction Plan
## Systematic Approach to Extract All 35+ IEPs Using the Defined Schema

**Created:** 2025-07-24  
**Status:** IMMEDIATE EXECUTION  
**Objective:** Extract all 35+ IEPs using the proper schema structure with high accuracy

---

## 🎯 SCHEMA-DRIVEN APPROACH

### Current Schema Structure (the_schema.json)
```json
{
  "meta": { doc_id, source, version, extracted_at },
  "student": { first_name, last_name, dob, student_id, grade, school, district },
  "meeting": { iep_start_date, iep_end_date, meeting_date, participants[] },
  "eligibility": { primary_disability, secondary_disabilities[], eligibility_date, reeval_due_date },
  "present_levels": { academic_achievement, functional_performance, strengths, needs, parent_input },
  "goals": [{ id, area, statement, baseline, criteria, measurement_method, progress_reporting_frequency, short_term_objectives[] }],
  "services": [{ id, type, provider_role, location, frequency{amount, unit}, duration_minutes, group_size, start_date, end_date }],
  "accommodations": [{ id, description, context, start_date, end_date }],
  "modifications": [{ id, description, context }],
  "assessment_participation": { state_assessments[] },
  "placement": { lre_percentage_general_ed, lre_description, transportation },
  "progress_reports": [{ goal_id, date, status, evidence }],
  "signatures": [{ name, role, signed_at }]
}
```

---

## 🚀 PHASE 1: IMMEDIATE SCHEMA IMPLEMENTATION (Day 1)

### 1.1 Update Extraction Schema
**Objective:** Replace current schema with the_schema.json structure

**Tasks:**
- [ ] **Replace Current Schema**: Update o4-mini-responses.ts to use the_schema.json structure
- [ ] **Add All Required Fields**: Ensure every field from the_schema.json is included
- [ ] **Fix Data Types**: Proper types for arrays, objects, dates, numbers
- [ ] **Add Validation**: Schema validation for all required fields

**Critical Fields to Extract:**
- **Student Info**: first_name, last_name, dob, student_id, grade, school, district
- **Goals**: area, statement, baseline, criteria, measurement_method, short_term_objectives
- **Services**: type, provider_role, location, frequency{amount, unit}, duration_minutes
- **Accommodations**: description, context with proper categorization
- **Present Levels**: academic_achievement, functional_performance, strengths, needs

### 1.2 Create Schema-Compliant Prompt
**Objective:** Update extraction prompt to target schema fields specifically

**Enhanced Prompt Strategy:**
```typescript
const schemaBasedPrompt = `
Extract IEP data following this EXACT schema structure:

STUDENT INFORMATION:
- Extract first_name and last_name separately
- Find student_id (may be labeled as ID, Student #, etc.)
- Extract grade level and school name
- Look for date of birth (dob) in MM/DD/YYYY or YYYY-MM-DD format

GOALS SECTION:
- For each goal, extract:
  * area: Subject/domain (Reading, Math, Behavior, etc.)
  * statement: Complete goal statement
  * baseline: Current performance level with specific data
  * criteria: Success criteria (e.g., "80% accuracy across 3 trials")
  * measurement_method: How progress is measured
  * short_term_objectives: List of sub-goals/benchmarks

SERVICES SECTION:
- For each service, extract:
  * type: Service name (Speech Therapy, OT, etc.)
  * provider_role: Who provides it (SLP, OT, etc.)
  * location: Where service is provided
  * frequency: {amount: NUMBER, unit: "sessions/week" or "minutes/week"}
  * duration_minutes: Length of each session
  * group_size: individual, small group, etc.

ACCOMMODATIONS:
- Extract each accommodation with:
  * description: What the accommodation is
  * context: Where it applies (classroom, testing, etc.)

PRESENT LEVELS:
- academic_achievement: Academic performance description
- functional_performance: Daily living/functional skills
- strengths: Student strengths
- needs: Areas needing support

Return JSON matching the exact schema structure.
`;
```

---

## 🔄 PHASE 2: BATCH PROCESSING SYSTEM (Day 1-2)

### 2.1 Create Batch Extraction Tool
**Objective:** Process all 35+ PDFs systematically

**Implementation:**
```typescript
// batch-extract-all.ts
interface BatchExtractionResult {
  filename: string;
  success: boolean;
  extractedData?: SchemaCompliantIEPData;
  error?: string;
  processingTime: number;
  cost: number;
}

async function extractAllPDFs(): Promise<BatchExtractionResult[]> {
  const pdfFiles = await glob('./samples/*.pdf');
  const results: BatchExtractionResult[] = [];
  
  for (const file of pdfFiles) {
    console.log(`Processing: ${file}`);
    try {
      const startTime = Date.now();
      const result = await extractWithSchemaCompliance(file);
      const processingTime = Date.now() - startTime;
      
      results.push({
        filename: file,
        success: true,
        extractedData: result.data,
        processingTime,
        cost: result.usage?.cost_usd || 0
      });
      
      // Save individual result
      await saveExtractionResult(file, result);
      
    } catch (error) {
      results.push({
        filename: file,
        success: false,
        error: error.message,
        processingTime: 0,
        cost: 0
      });
    }
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}
```

### 2.2 Progress Tracking and Resumption
**Objective:** Handle interruptions and track progress

**Features:**
- [ ] **Progress File**: Track which PDFs have been processed
- [ ] **Resume Capability**: Skip already processed files
- [ ] **Error Logging**: Detailed error tracking for failed extractions
- [ ] **Cost Tracking**: Running total of API costs

---

## 📊 PHASE 3: QUALITY ANALYSIS (Day 2)

### 3.1 Schema Compliance Validation
**Objective:** Ensure all extractions follow the schema

**Validation Checks:**
```typescript
function validateSchemaCompliance(data: any): ValidationResult {
  const issues: string[] = [];
  
  // Check required fields
  if (!data.student?.first_name) issues.push("Missing student.first_name");
  if (!data.student?.last_name) issues.push("Missing student.last_name");
  if (!data.goals || data.goals.length === 0) issues.push("No goals extracted");
  
  // Check goal structure
  data.goals?.forEach((goal, index) => {
    if (!goal.area) issues.push(`Goal ${index + 1}: Missing area`);
    if (!goal.statement) issues.push(`Goal ${index + 1}: Missing statement`);
    if (!goal.baseline) issues.push(`Goal ${index + 1}: Missing baseline`);
  });
  
  // Check service frequency structure
  data.services?.forEach((service, index) => {
    if (!service.frequency?.amount || !service.frequency?.unit) {
      issues.push(`Service ${index + 1}: Invalid frequency structure`);
    }
  });
  
  return { valid: issues.length === 0, issues };
}
```

### 3.2 Data Quality Metrics
**Objective:** Measure extraction completeness and accuracy

**Metrics to Track:**
- **Field Completeness**: % of schema fields populated per PDF
- **Goal Quality**: Average goals per PDF, baseline completeness
- **Service Accuracy**: Frequency format compliance, duration extraction
- **Student Info Completeness**: All required student fields present
- **Processing Success Rate**: % of PDFs successfully processed

---

## 🎯 PHASE 4: TARGETED IMPROVEMENTS (Day 3-4)

### 4.1 Common Issue Identification
**Objective:** Analyze patterns across all 35+ extractions

**Analysis Tasks:**
- [ ] **Missing Field Analysis**: Which fields are most commonly missing?
- [ ] **Format Pattern Analysis**: Different PDF formats and their challenges
- [ ] **Error Pattern Analysis**: Common extraction failures
- [ ] **Quality Score Distribution**: Which PDFs extract well vs poorly?

### 4.2 Prompt Refinement Based on Data
**Objective:** Improve prompt based on actual extraction patterns

**Iterative Improvement:**
1. **Identify Top 3 Issues**: Most common missing/incorrect fields
2. **Add Specific Instructions**: Target those issues in prompt
3. **Test on Sample**: Validate improvements on 5 representative PDFs
4. **Measure Improvement**: Compare before/after metrics
5. **Apply to Full Dataset**: Re-run extraction on all PDFs

---

## 📈 PHASE 5: VALIDATION AND DEPLOYMENT (Day 4-5)

### 5.1 Statistical Validation
**Objective:** Measure improvement across full dataset

**Validation Metrics:**
- **Schema Compliance Rate**: % of extractions following schema
- **Field Completeness Score**: Average % of fields populated
- **Critical Field Success**: Student info, goals, services extraction rates
- **Processing Reliability**: Success rate across all 35+ PDFs

### 5.2 Quality Assurance
**Objective:** Ensure consistent, reliable extraction

**QA Checks:**
- [ ] **Sample Manual Validation**: Manually check 5 diverse PDFs
- [ ] **Edge Case Testing**: Test with problematic PDFs
- [ ] **Consistency Testing**: Multiple extractions of same PDF
- [ ] **Performance Benchmarking**: Cost and time per PDF

---

## 🔧 TECHNICAL IMPLEMENTATION

### File Structure
```
src/
├── extractors/
│   ├── schema-compliant-extractor.ts (NEW - based on the_schema.json)
│   └── batch-processor.ts (NEW)
├── validation/
│   ├── schema-validator.ts (NEW)
│   └── quality-analyzer.ts (NEW)
├── scripts/
│   ├── extract-all-pdfs.ts (NEW)
│   └── analyze-results.ts (NEW)
└── the_schema.json (REFERENCE)
```

### Key Components

1. **Schema-Compliant Extractor**: Uses the_schema.json structure exactly
2. **Batch Processor**: Handles all 35+ PDFs with progress tracking
3. **Schema Validator**: Ensures all extractions follow schema
4. **Quality Analyzer**: Measures completeness and accuracy
5. **Results Aggregator**: Combines and analyzes all extractions

---

## 🎯 SUCCESS CRITERIA

### Quantitative Targets
- **Processing Success Rate**: 95%+ of 35+ PDFs successfully extracted
- **Schema Compliance**: 100% of successful extractions follow schema
- **Field Completeness**: 90%+ of schema fields populated on average
- **Critical Fields**: 95%+ success on student, goals, services
- **Service Frequency**: 90%+ have proper {amount, unit} structure

### Qualitative Targets
- **Consistent Structure**: All extractions use identical schema
- **Complete Data**: Goals have baselines, services have frequencies
- **Proper Types**: Arrays, objects, dates in correct format
- **Reliable Processing**: Handles diverse PDF formats

---

## ⚡ IMMEDIATE EXECUTION STEPS

### TODAY (Day 1):
1. **Update Extractor**: Replace current schema with the_schema.json structure
2. **Create Batch Tool**: Build system to process all 35+ PDFs
3. **Start Batch Extraction**: Begin processing all PDFs with new schema
4. **Track Progress**: Monitor success rates and issues

### TOMORROW (Day 2):
1. **Analyze Results**: Review all extractions for patterns
2. **Identify Issues**: Document most common problems
3. **Refine Prompt**: Target specific issues found
4. **Validate Improvements**: Test on sample PDFs

### DAY 3-4:
1. **Apply Improvements**: Re-run extraction with refined prompt
2. **Quality Analysis**: Measure improvement across dataset
3. **Final Validation**: Ensure schema compliance and accuracy

### DAY 5:
1. **Documentation**: Document final results and process
2. **Monitoring Setup**: Establish ongoing quality tracking
3. **Deployment**: Finalize improved extraction system

---

## 💰 COST MANAGEMENT

**Estimated Costs:**
- Initial batch extraction: 35 PDFs × $0.08 = ~$2.80
- Testing iterations: 5 samples × 3 iterations × $0.08 = ~$1.20
- Final validation: 35 PDFs × $0.08 = ~$2.80
- **Total estimated cost**: ~$7-10

**Cost Optimization:**
- Use representative sampling for testing
- Implement rate limiting to avoid overages
- Track costs in real-time
- Resume capability to avoid re-processing

---

**This plan follows your schema exactly, processes all 35+ PDFs systematically, and provides measurable results. Ready to execute immediately.**
