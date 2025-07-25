# IEP Extraction Accuracy Fix Plan
## Comprehensive Strategy to Restore and Improve Extraction Quality

**Created:** 2025-07-24  
**Status:** CRITICAL - Immediate Action Required  
**Objective:** Fix extraction regressions and achieve >95% accuracy vs ground truth

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### Current Extraction Failures (vs Old System)

| Field | Old System | New System | Status |
|-------|------------|------------|---------|
| **Progress Measures** | 11 checkbox options per goal | 1-4 items per goal | ❌ CRITICAL REGRESSION |
| **Service Frequencies** | "2 times per week", "30 minutes" | "per week" (missing numbers) | ❌ CRITICAL REGRESSION |
| **Baseline Data** | Complete performance data | May be truncated/incomplete | ⚠️ NEEDS VALIDATION |
| **Student Info** | Basic demographic data | Enhanced with parent/guardian info | ✅ IMPROVED |

### Root Cause Analysis

1. **Checkbox Detection Failure**: Model not recognizing visual checkbox indicators (✓, ✗, filled squares)
2. **Form vs Content Confusion**: Extracting template labels instead of filled data
3. **Numerical Value Extraction**: Missing handwritten/filled numbers in frequency fields
4. **Incomplete Visual Processing**: Not processing entire form sections systematically

---

## 📋 PHASE 1: IMMEDIATE DIAGNOSIS (Day 1)

### 1.1 Ground Truth Establishment
**Objective:** Manually document what SHOULD be extracted from Carter Powell PDF

**Tasks:**
- [ ] **Manual PDF Analysis**: Open Carter Powell PDF and document every checked checkbox
- [ ] **Progress Measures Audit**: Count and list all checked progress monitoring methods for each goal
- [ ] **Service Frequency Documentation**: Record exact numbers written in frequency fields
- [ ] **Baseline Content Analysis**: Verify baseline completeness and accuracy
- [ ] **Create Ground Truth JSON**: Document expected extraction results

**Deliverable:** `carter_powell_ground_truth.json` with manually verified correct data

### 1.2 Current Extraction Gap Analysis
**Objective:** Compare current extraction vs ground truth

**Tasks:**
- [ ] **Field-by-Field Comparison**: Document specific missing data
- [ ] **Progress Measures Gap**: List missing checkbox options
- [ ] **Service Frequency Gap**: Document missing numerical values
- [ ] **Completeness Metrics**: Calculate extraction completeness percentages

**Deliverable:** `extraction_gap_analysis.md` with specific deficiencies

### 1.3 Visual Pattern Analysis
**Objective:** Understand PDF visual structure for better extraction

**Tasks:**
- [ ] **Checkbox Pattern Documentation**: Document visual indicators used in PDF
- [ ] **Form Layout Analysis**: Map form sections and their visual patterns
- [ ] **Handwriting vs Print Analysis**: Identify how filled data appears visually
- [ ] **Section Boundaries**: Document how different form sections are visually separated

**Deliverable:** `pdf_visual_analysis.md` with extraction guidance

---

## 🔧 PHASE 2: PROMPT ENGINEERING FIXES (Day 1-2)

### 2.1 Enhanced Checkbox Detection Prompt
**Objective:** Create specific instructions for checkbox recognition

**Implementation:**
```typescript
const checkboxInstructions = `
CHECKBOX DETECTION RULES:
1. Look for these visual indicators:
   - ✓ (checkmark)
   - ✗ (X mark)  
   - ■ (filled square)
   - Highlighted/shaded boxes
   - Circled options
   
2. IGNORE unchecked options that appear as:
   - ☐ (empty square)
   - Unhighlighted text
   - Plain text lists without marks
   
3. For Progress Monitoring Methods:
   - Scan the ENTIRE list of 11 options
   - Extract ONLY those with visual selection indicators
   - Expected result: 8-11 checked options per goal
   
EXAMPLE:
If you see:
☐ A. Curriculum-Based Assessment
✓ B. Standardized Tests  
☐ C. Portfolios
✓ D. Observation
...

Extract: ["B. Standardized Tests", "D. Observation"]
`;
```

### 2.2 Service Frequency Number Extraction
**Objective:** Extract complete frequency specifications with numbers

**Implementation:**
```typescript
const frequencyInstructions = `
SERVICE FREQUENCY EXTRACTION:
1. Look for FILLED-IN numbers in frequency fields
2. Extract complete specifications:
   - "2 times per week" (not just "per week")
   - "30 minutes" (not just "minutes")
   - "1 session per month" (not just "per month")
   
3. Common patterns to look for:
   - Handwritten numbers in boxes
   - Typed numbers in form fields
   - Circled frequency options
   
4. If no number is visible, mark as "frequency not specified"

EXAMPLE:
If form shows: [2] times per [week] for [30] minutes
Extract: "2 times per week for 30 minutes"
`;
```

### 2.3 Baseline Performance Data Extraction
**Objective:** Extract complete performance data, not intervention instructions

**Implementation:**
```typescript
const baselineInstructions = `
BASELINE EXTRACTION RULES:
1. Extract PERFORMANCE DATA, not teaching methods
2. Look for:
   - Test scores and percentiles
   - Grade level performance
   - Specific skill assessments
   - Quantitative measures
   
3. AVOID extracting:
   - Intervention strategies
   - Teaching methods
   - Future goals
   
CORRECT: "Carter scored at kindergarten level (2nd percentile) on iReady diagnostic"
INCORRECT: "Carter will receive phonics instruction using systematic approach"
`;
```

### 2.4 Comprehensive Extraction Prompt
**Objective:** Combine all improvements into single, effective prompt

**Tasks:**
- [ ] **Integrate Instructions**: Combine checkbox, frequency, and baseline instructions
- [ ] **Add Few-Shot Examples**: Include correct vs incorrect extraction examples
- [ ] **Section-Specific Guidance**: Different instructions for different form sections
- [ ] **Validation Instructions**: Tell model to double-check its work

**Deliverable:** `enhanced_extraction_prompt.ts` with comprehensive instructions

---

## 🧪 PHASE 3: SCHEMA AND VALIDATION IMPROVEMENTS (Day 2)

### 3.1 Schema Validation Enhancement
**Objective:** Ensure schema captures all required fields correctly

**Tasks:**
- [ ] **Progress Measures Validation**: Ensure array can hold 8-11 items
- [ ] **Service Frequency Validation**: Add pattern matching for complete frequencies
- [ ] **Required Field Enforcement**: Mark critical fields as required
- [ ] **Data Type Validation**: Proper types for all fields

**Implementation:**
```typescript
// Enhanced schema validation
const progressMeasuresValidation = {
  type: "array",
  items: { type: "string" },
  minItems: 1,
  maxItems: 11,
  description: "All checked progress monitoring methods"
};

const serviceFrequencyValidation = {
  type: "string",
  pattern: "^\\d+\\s+(times?|sessions?)\\s+per\\s+(week|month|day)",
  description: "Complete frequency with numbers (e.g., '2 times per week')"
};
```

### 3.2 Extraction Validation Functions
**Objective:** Add runtime validation to catch incomplete extractions

**Tasks:**
- [ ] **Progress Measures Validator**: Check for minimum expected count
- [ ] **Service Frequency Validator**: Verify numbers are present
- [ ] **Baseline Completeness Validator**: Check for performance data keywords
- [ ] **Overall Completeness Score**: Calculate extraction quality metrics

**Implementation:**
```typescript
function validateExtraction(data: IEPData): ValidationResult {
  const issues: string[] = [];
  
  // Validate progress measures
  data.goals.forEach((goal, index) => {
    if (goal.progress_measures.length < 3) {
      issues.push(`Goal ${index + 1}: Only ${goal.progress_measures.length} progress measures (expected 8-11)`);
    }
  });
  
  // Validate service frequencies
  data.services.forEach((service, index) => {
    if (!service.frequency.match(/\d+/)) {
      issues.push(`Service ${index + 1}: Missing frequency numbers`);
    }
  });
  
  return { valid: issues.length === 0, issues };
}
```

---

## 🔄 PHASE 4: TESTING AND ITERATION (Day 2-3)

### 4.1 Regression Testing Framework
**Objective:** Ensure new extraction is better than old system

**Tasks:**
- [ ] **Create Test Suite**: Automated comparison of old vs new extraction
- [ ] **Ground Truth Validation**: Compare against manually verified data
- [ ] **Field-Specific Tests**: Individual tests for each problematic field
- [ ] **Performance Benchmarks**: Ensure no speed/cost regressions

**Implementation:**
```typescript
interface RegressionTest {
  field: string;
  oldValue: any;
  newValue: any;
  groundTruth: any;
  passed: boolean;
  improvement: number; // percentage improvement
}

function runRegressionTests(oldExtraction: IEPData, newExtraction: IEPData, groundTruth: IEPData): RegressionTest[] {
  // Implementation details...
}
```

### 4.2 Iterative Improvement Process
**Objective:** Systematic improvement until accuracy targets are met

**Process:**
1. **Run Extraction**: Test with improved prompt
2. **Validate Results**: Check against ground truth
3. **Identify Gaps**: Document remaining issues
4. **Refine Prompt**: Adjust instructions based on results
5. **Repeat**: Until >95% accuracy achieved

**Success Criteria:**
- Progress measures: 8-11 items per goal (vs current 1-4)
- Service frequencies: Complete numbers in >90% of cases
- Baseline accuracy: Performance data, not intervention instructions
- Overall improvement: New system strictly better than old system

### 4.3 Quality Metrics Implementation
**Objective:** Quantitative measurement of extraction quality

**Metrics:**
- **Field Completeness**: Percentage of expected fields extracted
- **Accuracy Score**: Comparison against ground truth
- **Regression Score**: Improvement over old system
- **Consistency Score**: Reliability across multiple runs

---

## 📊 PHASE 5: QUALITY ASSURANCE (Day 3-4)

### 5.1 Comprehensive Testing
**Objective:** Validate fixes across multiple PDFs

**Tasks:**
- [ ] **Multi-PDF Testing**: Test on all available IEP samples
- [ ] **Edge Case Testing**: Test with unusual or complex PDFs
- [ ] **Consistency Testing**: Multiple extractions of same PDF
- [ ] **Performance Testing**: Ensure acceptable speed and cost

### 5.2 Documentation and Monitoring
**Objective:** Document improvements and set up ongoing monitoring

**Tasks:**
- [ ] **Improvement Documentation**: Document all changes made
- [ ] **Accuracy Metrics**: Establish baseline accuracy measurements
- [ ] **Monitoring Setup**: Alerts for extraction quality degradation
- [ ] **User Guide**: Instructions for interpreting extraction results

---

## 🎯 SUCCESS CRITERIA

### Quantitative Targets
- **Progress Measures**: 8-11 items per goal (currently 1-4)
- **Service Frequencies**: 90%+ include complete numbers
- **Field Completeness**: 95%+ of expected fields extracted
- **Overall Accuracy**: >95% match with ground truth
- **Regression Score**: New system strictly better than old

### Qualitative Targets
- **Checkbox Detection**: Accurately identifies all checked options
- **Form vs Content**: Distinguishes template from filled data
- **Baseline Quality**: Extracts performance data, not interventions
- **Service Specifications**: Complete frequency and duration data

---

## 📅 EXECUTION TIMELINE

### Day 1 (Immediate)
- **Morning**: Manual PDF analysis and ground truth establishment
- **Afternoon**: Gap analysis and visual pattern documentation
- **Evening**: Begin prompt engineering improvements

### Day 2
- **Morning**: Complete enhanced prompt implementation
- **Afternoon**: Schema validation improvements
- **Evening**: Initial testing and validation

### Day 3
- **Morning**: Iterative prompt refinement based on test results
- **Afternoon**: Regression testing and quality metrics
- **Evening**: Multi-PDF validation testing

### Day 4
- **Morning**: Final validation and documentation
- **Afternoon**: Monitoring setup and user guide creation
- **Evening**: Deployment and success verification

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### File Structure
```
src/
├── extractors/
│   ├── o4-mini-responses.ts (main extractor - UPDATE)
│   └── enhanced-extraction-prompt.ts (NEW)
├── validation/
│   ├── extraction-validator.ts (NEW)
│   └── regression-tester.ts (NEW)
├── testing/
│   ├── ground-truth/
│   │   └── carter_powell_ground_truth.json (NEW)
│   └── regression-tests.ts (NEW)
└── docs/
    ├── extraction_gap_analysis.md (NEW)
    └── pdf_visual_analysis.md (NEW)
```

### Key Dependencies
- OpenAI API (o4-mini-2025-04-16) with Responses API
- TypeScript with strict type checking
- Validation libraries for schema enforcement
- Testing framework for regression testing

---

## 🚀 IMMEDIATE NEXT STEPS

1. **START NOW**: Begin manual PDF analysis to establish ground truth
2. **Document Everything**: Create detailed gap analysis
3. **Implement Systematically**: Follow phases in order
4. **Test Continuously**: Validate each improvement
5. **Measure Progress**: Track quantitative improvements

**This plan addresses every identified issue with specific, measurable fixes. Execute systematically and the extraction accuracy will be restored and improved beyond the old system.**
