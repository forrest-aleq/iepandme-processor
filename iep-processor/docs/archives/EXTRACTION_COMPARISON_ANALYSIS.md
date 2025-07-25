# Carter Powell IEP Extraction Comparison Analysis

## Executive Summary
Comparing the old extraction (July 18th) vs new extraction (July 24th) reveals **significant regressions** in the new system, despite fixing the schema validation issues.

## Key Findings

### ❌ **MAJOR REGRESSION: Progress Monitoring Methods**

**Old Extraction (WRONG but shows the problem):**
```json
"progress_measures": [
  "Curriculum-Based Assessment", "Portfolios", "Observation", 
  "Anecdotal Records", "Short-Cycle Assessments", "Performance Assessments",
  "Checklists", "Running Records", "Work Samples", "Inventories", "Rubrics"
]
```
- Shows ALL 11 checkbox options (the exact problem identified in audit)
- But at least captures the field

**New Extraction (MISSING FIELD):**
- No `progress_measures` field at all in the new schema
- This is a **regression** - we lost the field entirely

### ❌ **REGRESSION: Service Frequencies**

**Old Extraction (CORRECT):**
```json
"frequency": "1 time per week"
"duration": "60 minutes"
```

**New Extraction (BROKEN):**
```json
"frequency": "per week"
"duration": "60 mins"
```
- Lost the actual numbers ("1 time" became just "per week")
- This is worse than the old extraction

### ❌ **QUESTIONABLE: Baseline Content**

**Old Extraction:**
```json
"baseline": "Carter scored an overall Kindergarten level in the 2nd percentile."
```
- Short but appears to be actual performance data

**New Extraction:**
```json
"baseline": "teach kindergarten high frequency words; teach one to one letter correspondence with letters v, j, w, x, k, z, y; provide practice was decoding regularly spelled one syllable words with short vowel sounds"
```
- Longer but this looks like **intervention text**, not baseline performance
- May be extracting the wrong content entirely

### ❌ **MISSING FIELDS: Student Information**

**Old Extraction (MORE COMPLETE):**
```json
{
  "parent_guardian": "Anissa Powell",
  "parent_contact": "5132950351",
  "disability_category": ["Intellectual Disabilities"],
  "eligibility_date": "04/28/2023",
  "iep_date": "05/13/2025",
  "iep_review_date": "05/12/2026"
}
```

**New Extraction (MISSING DATA):**
```json
{
  "caseManager": {"name": "", "email": ""}
}
```
- Lost parent/guardian information
- Lost disability category
- Lost key dates

## Schema Comparison Issues

### Old Schema Advantages:
1. Had `progress_measures` field (even if populated incorrectly)
2. Captured service frequencies with numbers
3. More complete student information fields
4. Had `target` field separate from `description`

### New Schema Problems:
1. Missing `progress_measures` field entirely
2. Service frequency extraction regressed
3. Missing key student info fields
4. May be extracting wrong content for baselines

## Verification Against Source PDF Needed

**CRITICAL**: We need to examine the actual PDF to determine:
1. Which progress monitoring methods are actually checked (not all 11)
2. What the real baseline performance text says
3. What the actual service frequencies are
4. What other data we're missing

## Recommendations

1. **Immediate**: Examine the source PDF to establish ground truth
2. **Schema**: Add back missing fields from old schema (`progress_measures`, parent info, etc.)
3. **Prompt**: Fix baseline extraction to get performance data, not intervention text
4. **Frequency**: Fix service frequency extraction to capture numbers
5. **Validation**: Create side-by-side comparison with PDF for accuracy verification

## Conclusion

**The new extraction system has significant regressions compared to the old system.** While we fixed the schema validation issues, we lost important data and accuracy. The old system was closer to correct in several key areas.

We need to:
1. Verify against the actual PDF source
2. Combine the best of both extractions
3. Fix the specific accuracy issues identified
