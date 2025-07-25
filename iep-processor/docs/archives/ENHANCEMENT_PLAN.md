# 🎯 **Comprehensive IEP Extraction Enhancement Plan**

## 📋 **Executive Summary**

**Current State**: 60-65% schema compliance with major gaps in granularity, normalization, and completeness  
**Target State**: 95%+ compliance with comprehensive data capture and quality validation  
**Timeline**: 4 weeks (20 working days)  

### **Critical Issues Identified**
1. **Age Miscalculation**: Listed "9 years old" vs actual 11y 5m at IEP start
2. **Missing Objectives**: Goals lack required short-term objectives/benchmarks
3. **Incomplete Present Levels**: Missing granular reading subskills, math RIT scores
4. **Service Structure Gaps**: Missing frequency numbers, session breakdowns
5. **Accommodation Categorization**: No separation of instruction vs testing accommodations
6. **Missing Data Elements**: ETR dates, additional guardians, assessment scores

---

## 🔍 **PHASE 1: Foundation & Research (Days 1-3)**

### **Day 1: Schema Enhancement**

#### **Task 1.1: Create Enhanced Schema Files**

**File: `/src/types/enhanced-iep-data.ts`** (NEW)
```typescript
export interface EnhancedIEPData extends IEPData {
  calculatedFields: {
    ageAtIEPStart: number | null;
    ageAtIEPEnd: number | null;
    processingDate: string;
  };
  
  leastRestrictiveEnvironment: {
    placementDescription: string | null;
    justification: string | null;
    extracurricularParticipation: string | null;
  };
  
  progressReporting: {
    intervalWeeks: number | null;
    methods: string[] | null;
  };
  
  dataQualityFlags: string[];
  
  presentLevelsDetailed: {
    academics: {
      reading: {
        decodingLevel: string | null;
        comprehensionLevel: string | null;
        phonicsSkills: string[] | null;
        sightWords: string[] | null;
        fluencyRate: number | null;
        percentile: number | null;
      };
      math: {
        ritScore: number | null;
        onGradeMinimum: number | null;
        demonstratedSkills: string[] | null;
        percentile: number | null;
      };
    };
  };
}
```

**File: `/src/schemas/enhanced-iep-schema.ts`** (NEW)
- Complete JSON schema with all missing elements
- Structured goal decomposition (condition, behavior, criterion)
- Service normalization fields
- Accommodation categorization

### **Day 2: Prompt Engineering Research**

#### **Key o4-mini Best Practices:**
- **Keep prompts clear and minimal** - avoid excessive context
- **Avoid unnecessary few-shot examples** - can degrade performance  
- **Use system instructions for role/format** - define output structure clearly
- **Leverage reasoning capabilities** - let model think through complex extractions

#### **Multi-Stage Extraction Design:**
1. **Stage 1**: Basic demographic and structural extraction
2. **Stage 2**: Detailed present levels with granular skills
3. **Stage 3**: Goal decomposition with objectives separation
4. **Stage 4**: Service normalization and accommodation categorization
5. **Stage 5**: Data quality validation and flag generation

### **Day 3: Validation Framework Design**

**File: `/src/validators/data-quality-validator.ts`** (NEW)
```typescript
export interface DataQualityRule {
  name: string;
  description: string;
  validator: (data: EnhancedIEPData) => boolean;
  severity: 'error' | 'warning' | 'info';
  autoFix?: (data: EnhancedIEPData) => EnhancedIEPData;
}

export const DATA_QUALITY_RULES: DataQualityRule[] = [
  {
    name: 'ageMiscomputed',
    description: 'Age calculation incorrect based on DOB and IEP start date',
    validator: (data) => validateAgeCalculation(data),
    severity: 'error',
    autoFix: (data) => calculateCorrectAge(data)
  },
  {
    name: 'missingServiceFrequencyNumber',
    description: 'Service frequency lacks numeric count',
    validator: (data) => validateServiceFrequencies(data),
    severity: 'warning'
  }
];
```

---

## 🔧 **PHASE 2: Core Implementation (Days 4-12)**

### **Day 4-5: Enhanced Schema Implementation**

**File: `/src/schemas/enhanced-iep-schema.ts`**
- Add all missing schema elements identified in audit
- Include structured present levels with reading/math subfields
- Add goal decomposition fields (condition, behavior, criterion)
- Add service normalization (minutesPerSession, sessionsPerWeek)
- Add accommodation categorization (applicableContexts, subjects)

### **Day 6-7: Enhanced Prompt Engineering**

**File: `/src/prompts/enhanced-extraction-prompts.ts`** (NEW)
```typescript
export const STAGE_1_BASIC_EXTRACTION = `
You are an expert IEP document analyst. Extract basic demographic and structural information.

Focus on accuracy and completeness. Pay special attention to:
- Exact dates and age calculations
- All listed guardians/parents  
- Precise disability categories
- Meeting and evaluation dates

Return structured JSON matching the provided schema.
`;

export const STAGE_2_PRESENT_LEVELS = `
You are an expert educational assessor. Extract detailed present levels of performance.

Focus on granular academic details:
- Reading: decoding level, phonics skills, sight words, fluency rates, percentiles
- Math: RIT scores, grade-level minimums, demonstrated skills, percentiles
- Functional areas: communication, motor, behavioral, adaptive skills

Extract specific skill inventories and assessment data.
`;
```

**File: `/src/extractors/enhanced-o4-mini-responses.ts`** (NEW)
- Implement multi-stage extraction process
- Use optimized prompts for each stage
- Combine results with data enhancement pipeline

### **Day 8-9: Data Quality Validation**

**File: `/src/validators/data-quality-validator.ts`**
```typescript
export class DataQualityValidator {
  public validate(data: EnhancedIEPData): ValidationResult {
    const flags: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate age calculation
    if (!this.validateAgeCalculation(data)) {
      flags.push('ageMiscomputed');
      errors.push('Age calculation incorrect');
    }
    
    // Validate service frequencies
    if (!this.validateServiceFrequencies(data)) {
      flags.push('missingServiceFrequencyNumber');
      warnings.push('Service frequency lacks numeric count');
    }
    
    // Additional validation rules...
    
    return { valid: errors.length === 0, errors, warnings, dataQualityFlags: flags };
  }
  
  public autoFix(data: EnhancedIEPData): EnhancedIEPData {
    // Auto-fix age calculations, service parsing, etc.
    return data;
  }
}
```

### **Day 10-11: Post-Processing Enhancement**

**File: `/src/processors/data-enhancement-pipeline.ts`** (NEW)
```typescript
export class DataEnhancementPipeline {
  public async enhance(rawData: Partial<EnhancedIEPData>): Promise<EnhancedIEPData> {
    let enhancedData = this.initializeDefaults(rawData);
    
    // Calculate derived fields (age, service totals)
    enhancedData = this.calculateDerivedFields(enhancedData);
    
    // Normalize structures (services, accommodations)
    enhancedData = this.normalizeStructures(enhancedData);
    
    // Validate and auto-fix
    enhancedData = this.validator.autoFix(enhancedData);
    
    // Generate quality flags
    const validation = this.validator.validate(enhancedData);
    enhancedData.dataQualityFlags = validation.dataQualityFlags;
    
    return enhancedData;
  }
}
```

### **Day 12: Integration & Testing Setup**

**File: `/src/index.enhanced.ts`** (NEW)
- Integrate enhanced extraction pipeline
- Add comprehensive error handling
- Implement performance monitoring

---

## 🧪 **PHASE 3: Testing & Validation (Days 13-16)**

### **Day 13-14: Comprehensive Testing Framework**

**File: `/src/tests/enhanced-accuracy-test.ts`** (NEW)
- Create comprehensive test suite
- Validate against expected results for Carter Powell IEP
- Test all data quality rules

**File: `/src/tests/test-data/carter-powell-expected.json`** (NEW)
- Create detailed expected results based on audit findings
- Include all granular details (reading subskills, math RIT, objectives)

### **Day 15-16: Performance Optimization**

- Optimize multi-stage extraction for speed
- Implement parallel processing where possible
- Add caching for repeated extractions
- Create performance benchmarks

---

## 🚀 **PHASE 4: Deployment & Monitoring (Days 17-20)**

### **Day 17-18: Production Preparation**

**File: `/src/migration/schema-migration.ts`** (NEW)
- Create migration strategy from legacy to enhanced format
- Implement backward compatibility
- Add feature flags for gradual rollout

### **Day 19: Documentation & Training**

**File: `/docs/ENHANCED_EXTRACTION_GUIDE.md`**
- Document all new features and capabilities
- Provide usage examples and troubleshooting guide

### **Day 20: Final Testing & Launch**

- Run full production validation
- Set up monitoring and alerts
- Deploy with gradual rollout

---

## 📊 **Success Metrics & KPIs**

### **Accuracy Targets**
- **Student Demographics**: 98%+ (from ~85%)
- **Present Levels Detail**: 90%+ (from ~40%)
- **Goal/Objective Separation**: 95%+ (from ~50%)
- **Service Normalization**: 90%+ (from ~60%)
- **Schema Compliance**: 95%+ (from 65%)

### **Performance Targets**
- **Processing Time**: <30 seconds per document
- **Cost per Document**: <$0.50
- **Data Quality Flags**: <3 flags per document average

---

## 🔧 **Implementation Priorities**

### **High Priority (Week 1)**
1. Age calculation fix
2. Goal/objective separation
3. Present levels detail extraction
4. Basic data quality validation

### **Medium Priority (Week 2-3)**
1. Service normalization
2. Accommodation categorization
3. Assessment data extraction
4. Comprehensive testing

### **Lower Priority (Week 4)**
1. Performance optimization
2. Advanced monitoring
3. Documentation
4. Gradual deployment

---

## 📋 **Clarification Questions**

1. **Should we prioritize accuracy over processing speed?**
2. **What's the acceptable cost increase for enhanced accuracy?**
3. **Do you want backward compatibility maintained during transition?**
4. **Should we implement all validation rules or start with critical ones?**
5. **What's the preferred deployment strategy - big bang or gradual rollout?**

This plan addresses all major issues identified in your audit while providing a structured approach to implementation. Would you like me to elaborate on any specific phase or create detailed implementation files for any particular component?
