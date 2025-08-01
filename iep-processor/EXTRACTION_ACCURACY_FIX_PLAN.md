# IEP EXTRACTION ACCURACY FIX PLAN

## IDENTIFIED ISSUES

Based on Carter Powell IEP analysis, the following specific extraction issues need to be fixed:

### 1. **Section Boundary Confusion**
- **Problem**: "3. Profile" content bleeding into "4. Extended School Year" after page breaks
- **Root Cause**: AI struggling with section boundaries across page breaks
- **Impact**: Incorrect content attribution

### 2. **Missing Goal Fields**
- **Problem**: Goals missing critical fields:
  - `PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE`
  - `METHOD(S) FOR MEASURING THE CHILD'S PROGRESS TOWARDS ANNUAL GOAL`
- **Root Cause**: Compressed schema simplified goal structure
- **Impact**: Incomplete goal data extraction

### 3. **Missing Service Fields**
- **Problem**: Services missing:
  - `GOAL ADDRESSED #`
  - `BEGIN DATE`
  - `END DATE`
- **Root Cause**: Compressed schema removed these fields
- **Impact**: Incomplete service tracking

### 4. **Skipped Sections**
- **Problem**: Missing sections:
  - `9. NONACADEMIC AND EXTRACURRICULAR ACTIVITIES`
  - `10. GENERAL FACTORS`
- **Root Cause**: Not included in compressed schema
- **Impact**: Incomplete IEP coverage

### 5. **Missing Testing Section**
- **Problem**: No `12. STATEWIDE AND DISTRICT WIDE TESTING` content
- **Root Cause**: Section not properly defined in schema
- **Impact**: Missing assessment data

## FIX PLAN

### **PHASE 1: SCHEMA ENHANCEMENT** (1-2 hours)

#### 1.1 Restore Missing Goal Fields
```json
"6. MEASURABLE ANNUAL GOALS": {
  "type": "object",
  "properties": {
    "GOALS": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "NUMBER": {"type": "number"},
          "AREA": {"type": "string"},
          "PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE": {"type": "string"},
          "MEASURABLE ANNUAL GOAL": {"type": "string"},
          "METHOD(S) FOR MEASURING THE CHILD'S PROGRESS TOWARDS ANNUAL GOAL": {"type": "string"},
          "Objectives/Benchmarks": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "OBJECTIVE": {"type": "string"},
                "DATE OF MASTERY": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}
```

#### 1.2 Restore Missing Service Fields
```json
"SPECIALLY DESIGNED INSTRUCTION": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "Description": {"type": "string"},
      "GOAL ADDRESSED #": {"type": "number"},
      "Provider Title": {"type": "string"},
      "Location of Service": {"type": "string"},
      "Begin Date": {"type": "string"},
      "End Date": {"type": "string"},
      "Amount of Time": {"type": "string"},
      "Frequency": {"type": "string"}
    }
  }
}
```

#### 1.3 Add Missing Sections
```json
"9. NONACADEMIC AND EXTRACURRICULAR ACTIVITIES": {
  "type": "object",
  "properties": {
    "Participation with nondisabled peers": {"type": "string"},
    "If the child will not participate, explain": {"type": "string"}
  }
},
"10. GENERAL FACTORS": {"type": "string"},
"12. STATEWIDE AND DISTRICT WIDE TESTING": {
  "type": "object",
  "properties": {
    "Participation": {"type": "string"},
    "Accommodations": {"type": "string"},
    "Exemptions": {"type": "string"}
  }
}
```

### **PHASE 2: PROMPT ENHANCEMENT** (30 minutes)

#### 2.1 Add Enhanced Section Boundary Instructions
```text
**🎯 SECTION BOUNDARY DETECTION:**
- Look for numbered section headers (1., 2., 3., etc.)
- Each section continues until the next numbered header appears
- Pay special attention to content across page breaks
- Do NOT mix content from different numbered sections
- If unsure about section boundaries, err on the side of including content in the earlier section

**📍 SECTION BOUNDARY RULES:**
- Section headers follow pattern: "NUMBER. SECTION NAME" (e.g., "3. PROFILE")
- Content belongs to a section until you see the NEXT numbered header
- Page breaks do NOT end sections - only numbered headers do
- Look for these exact patterns:
  * "3. PROFILE" → everything until "4. EXTENDED SCHOOL YEAR"
  * "4. EXTENDED SCHOOL YEAR" → everything until "5. POSTSECONDARY"
- If you see content after a page break with no new number, it belongs to the previous section
```

#### 2.2 Add Specific Section Emphasis
```text
**📋 REQUIRED SECTIONS TO EXTRACT:**
1. FUTURE PLANNING
2. SPECIAL INSTRUCTIONAL FACTORS  
3. PROFILE (complete content across all pages)
4. EXTENDED SCHOOL YEAR SERVICES
5. POSTSECONDARY TRANSITION
6. MEASURABLE ANNUAL GOALS (with PRESENT LEVEL and METHODS)
7. SPECIALLY DESIGNED SERVICES (with GOAL ADDRESSED, BEGIN/END dates)
8. TRANSPORTATION
9. NONACADEMIC AND EXTRACURRICULAR ACTIVITIES
10. GENERAL FACTORS
11. MEETING PARTICIPANTS
12. STATEWIDE AND DISTRICT WIDE TESTING
13. AMENDMENTS
14. IEP TEAM MEETING INFORMATION
15. SIGNATURES
```

#### 2.3 Add Goal-Specific Instructions
```text
**🎯 GOAL EXTRACTION REQUIREMENTS:**
- For each goal, extract ALL fields:
  - NUMBER, AREA
  - PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE (full text)
  - MEASURABLE ANNUAL GOAL
  - METHOD(S) FOR MEASURING THE CHILD'S PROGRESS TOWARDS ANNUAL GOAL
  - All Objectives/Benchmarks with DATE OF MASTERY
```

#### 2.4 Add Service-Specific Instructions
```text
**🎯 SERVICE EXTRACTION REQUIREMENTS:**
- For each service, extract ALL fields:
  - Description
  - GOAL ADDRESSED # (which goal number this service supports)
  - Provider Title
  - Location of Service  
  - Begin Date, End Date
  - Amount of Time, Frequency
```

### **PHASE 3: TESTING & VALIDATION** (30 minutes)

#### 3.1 Test Carter Powell IEP
- Run extraction with enhanced schema and prompt
- Verify all 5 identified issues are resolved
- Check character count stays under 15k limit

#### 3.2 Validation Checklist
- [ ] Section 3 content doesn't bleed into Section 4
- [ ] Goals include PRESENT LEVEL and METHODS fields
- [ ] Services include GOAL ADDRESSED, BEGIN/END dates
- [ ] Section 9 (NONACADEMIC) extracted
- [ ] Section 10 (GENERAL FACTORS) extracted  
- [ ] Section 12 (TESTING) extracted

## IMPLEMENTATION STEPS

### Step 1: Create Enhanced Schema
1. Copy `the_schema_compressed_fixed.json` to `the_schema_enhanced.json`
2. Add missing goal fields (PRESENT LEVEL, METHODS)
3. Add missing service fields (GOAL ADDRESSED, BEGIN/END)
4. Add missing sections (9, 10, 12)
5. Verify character count < 15,000

### Step 2: Update Prompt
1. Add section boundary detection instructions
2. Add specific section emphasis list
3. Add goal-specific extraction requirements
4. Add service-specific extraction requirements

### Step 3: Update Extractor
1. Point to new enhanced schema file
2. Test with Carter Powell PDF
3. Validate all issues are resolved

### Step 4: Regression Testing
1. Test with 2-3 other PDFs to ensure no regressions
2. Verify schema compliance
3. Document any remaining issues

## SUCCESS CRITERIA

✅ **Section Boundaries**: Content correctly attributed to proper sections
✅ **Complete Goals**: All goals include PRESENT LEVEL and METHODS fields  
✅ **Complete Services**: All services include GOAL ADDRESSED and dates
✅ **All Sections**: Sections 9, 10, 12 successfully extracted
✅ **Schema Compliance**: Under 15k character limit maintained
✅ **No Regressions**: Other PDFs continue to extract correctly

## ESTIMATED TIME: 2-3 hours total
