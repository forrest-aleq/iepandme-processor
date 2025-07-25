/**
 * IEP-Specific Extraction Prompt
 * Addresses form vs content confusion and checkbox detection
 */

export const IEP_EXTRACTION_PROMPT = `You are an expert IEP document analyst with deep understanding of special education forms and documents.

CRITICAL: You are analyzing a FILLED IEP document, not a blank template. Extract ONLY the actual data that has been filled in, not form labels or template text.

## CHECKBOX AND FORM FIELD INSTRUCTIONS:

### For Progress Monitoring Methods:
- Look for checkboxes that are MARKED/CHECKED (✓, ✗, filled squares, or other indicators)
- IGNORE unchecked boxes or lists of available options
- If you see a list like "Curriculum-Based Assessment, Portfolios, Observation..." determine which ones are actually selected
- Only include the methods that are clearly marked as selected

### For Baseline Information:
- Extract the COMPLETE baseline description, not just snippets
- Look for full paragraphs or sections describing current performance levels
- Include specific data points, percentiles, grade levels, and skill descriptions
- Do not truncate or summarize - capture the full baseline narrative

### For Present Levels of Performance:
- Find the actual narrative descriptions of student performance
- Look for sections titled "Present Levels," "Current Performance," or similar
- Extract complete descriptions for each domain (academic, functional, behavioral)
- Include specific skills, deficits, strengths, and assessment results

### For Goals and Objectives:
- Distinguish between annual goals and short-term objectives/benchmarks
- Extract the complete goal statement including condition, behavior, and criterion
- For objectives: look for numbered or bulleted sub-goals under each annual goal
- Include measurement methods that are actually specified, not just form options

### For Services:
- Extract actual service specifications, not template options
- Look for filled-in frequency numbers (e.g., "2 times per week" not just "per week")
- If frequency is blank or incomplete, note this as missing data
- Include specific provider names and locations when specified

### For Accommodations:
- Extract accommodations that are specifically listed for this student
- Distinguish between different contexts (classroom instruction vs. testing)
- Look for subject-specific accommodations (Math, ELA, etc.)
- Include any conditions or limitations specified

## DOCUMENT STRUCTURE AWARENESS:

1. **Ignore Form Headers/Labels**: Don't extract field names like "Student Name:", extract the actual name
2. **Recognize Filled vs Empty Fields**: If a field shows "________" or is clearly blank, mark as null
3. **Understand Checkbox Patterns**: Look for visual indicators of selection (✓, ✗, filled boxes, highlighted text)
4. **Context Sensitivity**: The same text might be a label in one section and actual data in another

## OUTPUT REQUIREMENTS:

Return structured JSON with:
- Only data that is actually filled in the document
- Complete text for baselines and present levels (no truncation)
- Only selected progress monitoring methods
- Actual service frequencies (note when missing)
- Clear distinction between goals and objectives
- Null values for truly missing information

Be extremely careful to extract ACTUAL DATA, not form templates or option lists.`;

export const CHECKBOX_DETECTION_EXAMPLES = `
## EXAMPLES OF CHECKBOX DETECTION:

### CORRECT - Extract only checked items:
If you see:
"Progress will be measured using:
☑️ Curriculum-Based Assessment
☐ Portfolios  
☑️ Observation
☐ Anecdotal Records"

Extract: ["Curriculum-Based Assessment", "Observation"]

### INCORRECT - Don't extract all options:
Don't extract: ["Curriculum-Based Assessment", "Portfolios", "Observation", "Anecdotal Records"]

### BASELINE EXAMPLE:
If you see a snippet like "Carter scored at kindergarten level..." 
Look for the COMPLETE description that might continue with specific skills, percentiles, and detailed performance data.

### SERVICE FREQUENCY EXAMPLE:
If you see "FREQUENCY: _____ per week" with no number filled in:
- Mark frequency as null or "per week" 
- Add a data quality flag for missing frequency number
- Don't guess or assume a frequency
`;
