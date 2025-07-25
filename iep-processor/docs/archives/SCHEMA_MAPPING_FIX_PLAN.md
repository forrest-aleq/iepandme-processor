# Schema Mapping Fix Plan - Critical Issues Resolution

**Date**: July 24, 2025  
**Priority**: CRITICAL - Production Breaking  
**Estimated Time**: 6-8 hours  

## Problem Summary

The IEP extraction system has **4 different, incompatible schema structures** causing critical data extraction failures:

- **Services missing frequency numbers**: "per week" instead of `{amount: 2, unit: "sessions", per: "week"}`
- **Goals field mismatches**: `goalArea` vs `area`, `description` vs `statement`
- **Student info structure inconsistencies**: `name` vs `firstName`/`lastName` split
- **No schema validation** against the canonical structure

## Current Schema Conflicts

### 1. **`the_schema.json`** (✅ CANONICAL - CORRECT)
```json
{
  "frequency": {"amount": number, "unit": string, "per": string},
  "goals": {"area": string, "statement": string, "baseline": string},
  "studentInfo": {"firstName": string, "lastName": string}
}
```

### 2. **`src/types.ts`** (❌ BROKEN)
```typescript
{
  frequency: string,  // Missing structured data!
  goals: {goalArea: string, description: string},  // Wrong field names
  studentInfo: {name: string}  // Missing firstName/lastName split
}
```

### 3. **`src/extractors/o4-mini-responses.ts`** (❌ BROKEN)
```typescript
{
  services: {frequency: string, duration: string},  // Wrong structure
  goals: {goalArea: string, description: string},   // Wrong field names
  accommodations: {category: string, settings: string[]}  // Wrong structure
}
```

### 4. **`src/extractors/schema-compliant-extractor.ts`** (❌ BROKEN)
```typescript
{
  student: {first_name: string, last_name: string},  // Snake_case!
  meeting: {iep_start_date: string},  // Wrong field names
  present_levels: {academic_achievement: string}  // Wrong structure
}
```

## Fix Plan - 4 Phases

### **Phase 1: Create Canonical TypeScript Interface (1 hour)**

**Objective**: Generate TypeScript interface that exactly matches `the_schema.json`

**Tasks**:
1. **Create `src/schemas/canonical-types.ts`**:
   ```typescript
   export interface CanonicalIEPData {
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
       area: string;
       topic?: string | null;
       baseline: string;
       statement: string;
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
       serviceType: string;
       providerRole?: string | null;
       sessionLocation?: string | null;
       sessionType?: string | null;
       groupSize?: number | null;
       frequency: {
         amount: number;
         unit: string;
         per: string;
       };
       durationMinutes: number;
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
     // ... rest of canonical schema
   }
   ```

2. **Generate JSON Schema for OpenAI Responses API**:
   - Convert canonical interface to strict JSON schema
   - Ensure all required fields are properly marked
   - Add `additionalProperties: false` for strict compliance

**Deliverables**:
- ✅ `src/schemas/canonical-types.ts`
- ✅ `src/schemas/canonical-json-schema.ts`

### **Phase 2: Update All Extractors (2-3 hours)**

**Objective**: Modify all extraction logic to output canonical schema format

**Tasks**:

1. **Fix `src/extractors/o4-mini-responses.ts`**:
   ```typescript
   // BEFORE (BROKEN):
   services: Array<{
     type: string;
     frequency: string;  // "2 times per week" - unstructured!
     duration: string;
   }>;

   // AFTER (FIXED):
   services: Array<{
     serviceType: string;
     frequency: {
       amount: 2,
       unit: "sessions", 
       per: "week"
     };
     durationMinutes: number;
   }>;
   ```

2. **Update OpenAI JSON Schema**:
   - Replace current schema with canonical structure
   - Add specific prompting for frequency parsing
   - Include field mapping instructions

3. **Fix Goals Structure**:
   ```typescript
   // BEFORE: {goalArea: string, description: string}
   // AFTER:  {area: string, statement: string}
   ```

4. **Fix Student Info**:
   ```typescript
   // BEFORE: {name: string}
   // AFTER:  {name: string, firstName?: string, lastName?: string}
   ```

**Deliverables**:
- ✅ Updated `o4-mini-responses.ts` with canonical schema
- ✅ Updated `improved-o4-mini-responses.ts`
- ✅ Updated `schema-compliant-extractor.ts`

### **Phase 3: Enhanced Frequency Extraction (1-2 hours)**

**Objective**: Implement intelligent frequency parsing to extract structured data

**Tasks**:

1. **Create Frequency Parser Utility**:
   ```typescript
   // src/utils/frequency-parser.ts
   export function parseFrequency(text: string): {amount: number, unit: string, per: string} {
     // "2 times per week" → {amount: 2, unit: "sessions", per: "week"}
     // "30 minutes weekly" → {amount: 30, unit: "minutes", per: "week"}
     // "Once monthly" → {amount: 1, unit: "sessions", per: "month"}
   }
   ```

2. **Update Extraction Prompts**:
   ```
   For services, extract frequency as structured data:
   - If you see "2 times per week", output: {"amount": 2, "unit": "sessions", "per": "week"}
   - If you see "30 minutes daily", output: {"amount": 30, "unit": "minutes", "per": "day"}
   - Always include amount (number), unit (sessions/minutes/hours), and per (week/month/day)
   ```

3. **Add Post-Processing**:
   - Parse any string frequencies into structured format
   - Validate frequency objects before output

**Deliverables**:
- ✅ `src/utils/frequency-parser.ts`
- ✅ Updated extraction prompts
- ✅ Post-processing validation

### **Phase 4: Schema Validation & Testing (2 hours)**

**Objective**: Implement runtime validation and comprehensive testing

**Tasks**:

1. **Create Schema Validator**:
   ```typescript
   // src/validation/canonical-validator.ts
   export function validateCanonicalSchema(data: any): {
     valid: boolean;
     errors: string[];
     warnings: string[];
   }
   ```

2. **Add Runtime Validation**:
   - Validate all extraction outputs against canonical schema
   - Log detailed validation errors
   - Implement fallback/retry logic for invalid outputs

3. **Comprehensive Testing**:
   ```bash
   # Test with existing PDFs
   npm run test:extraction
   
   # Verify schema compliance
   npm run test:schema-validation
   
   # Compare before/after results
   npm run test:regression
   ```

4. **Update All Import Statements**:
   - Replace old `IEPData` imports with `CanonicalIEPData`
   - Update type annotations throughout codebase
   - Fix any TypeScript compilation errors

**Deliverables**:
- ✅ Schema validation system
- ✅ Comprehensive test suite
- ✅ All imports updated
- ✅ Zero TypeScript errors

## Success Criteria

### **Before Fix (Current Broken State)**:
- ❌ Services: `frequency: "per week"` (missing numbers)
- ❌ Goals: `goalArea`, `description` (wrong field names)
- ❌ Student: `name` only (missing firstName/lastName)
- ❌ 4 different incompatible schemas
- ❌ No schema validation

### **After Fix (Target State)**:
- ✅ Services: `frequency: {amount: 2, unit: "sessions", per: "week"}`
- ✅ Goals: `area`, `statement`, `baseline` (correct field names)
- ✅ Student: `name`, `firstName`, `lastName` (complete data)
- ✅ Single canonical schema used everywhere
- ✅ Runtime schema validation with detailed error reporting

### **Quality Metrics**:
- **Schema Compliance**: 100% of extractions match canonical schema
- **Frequency Parsing**: 95%+ of services include structured frequency data
- **Field Mapping**: 100% correct field names (no more `goalArea` vs `area`)
- **Validation**: All outputs pass strict JSON schema validation

## Implementation Order

1. **Start with Phase 1** - Create canonical types (foundation)
2. **Phase 2** - Update extractors (core fix)
3. **Phase 3** - Enhanced frequency parsing (accuracy improvement)
4. **Phase 4** - Validation & testing (quality assurance)

## Risk Mitigation

- **Backup current working extractors** before modifications
- **Implement gradual rollout** - test one extractor at a time
- **Maintain backward compatibility** during transition
- **Add extensive logging** for debugging schema issues

## Files to Modify

### **New Files**:
- `src/schemas/canonical-types.ts`
- `src/schemas/canonical-json-schema.ts`
- `src/utils/frequency-parser.ts`
- `src/validation/canonical-validator.ts`

### **Modified Files**:
- `src/extractors/o4-mini-responses.ts`
- `src/extractors/improved-o4-mini-responses.ts`
- `src/extractors/schema-compliant-extractor.ts`
- `src/types.ts` (update or deprecate)
- All files importing `IEPData`

## Expected Outcomes

After implementing this fix plan:

1. **Services will include complete frequency data**: `{amount: 2, unit: "sessions", per: "week"}`
2. **Goals will use correct field names**: `area`, `statement`, `baseline`
3. **Student info will be properly structured**: `firstName`, `lastName` split
4. **All extractors will output identical schema format**
5. **Runtime validation will catch schema violations**
6. **Extraction accuracy will improve significantly**

This fix addresses the root cause of the extraction regressions and establishes a solid foundation for future improvements.
