import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Types for API usage and response
interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

interface FormSpecificIEPData {
  [key: string]: any;
}

/**
 * Calculate cost for o4-mini-2025-04-16 model
 */
function calculate_cost(model: string, inputTokens: number, outputTokens: number, cachedInputTokens: number = 0): number {
  // Pricing known for o4-mini-2025-04-16; default to 0 for unknown models
  if (model === 'o4-mini-2025-04-16') {
    const inputCostPerToken = 1.10 / 1000000;  // $1.10 per million input tokens
    const outputCostPerToken = 4.40 / 1000000; // $4.40 per million output tokens
    return (inputTokens * inputCostPerToken) + (outputTokens * outputCostPerToken);
  }
  if (model === 'gpt-5-2025-08-07') {
    // GPT-5 pricing provided by user
    const inputCostPerToken = 1.25 / 1_000_000;     // $1.25 per million
    const cachedInputCostPerToken = 0.125 / 1_000_000; // $0.125 per million
    const outputCostPerToken = 10.00 / 1_000_000;   // $10.00 per million
    const nonCachedInput = Math.max(0, inputTokens - (cachedInputTokens || 0));
    return (nonCachedInput * inputCostPerToken) + (cachedInputTokens * cachedInputCostPerToken) + (outputTokens * outputCostPerToken);
  }
  // TODO: add pricing for other models when available
  return 0;
}

/**
 * Extract IEP data using OpenAI Responses API with complete master schema compliance
 */
export async function extractWithFormSpecificCompliance(
  filePath: string,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<{data: FormSpecificIEPData; usage?: ApiUsage; model: string}> {
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Prefer GPT-5 by default; allow override via env
  const MODEL = process.env.OPENAI_MODEL || 'gpt-5-2025-08-07';

  console.log(`📄 Processing: ${filePath.split('/').pop()}`);

  // Enhanced comprehensive prompt for complete extraction
  const prompt = `You are an expert at extracting structured data from IEP (Individualized Education Program) documents.

Your task is to extract ALL information from this IEP document and structure it according to the provided JSON schema.

Return JSON matching the complete schema structure. Extract all available sections from the document. For sections not found in the document, include them with empty values ("", [], or {} as appropriate).

IMPORTANT: You must return valid JSON that matches the provided schema structure exactly.

CRITICAL: You MUST extract ALL sections from the schema, including:

**REQUIRED TOP-LEVEL SECTIONS:**
- CHILD'S INFORMATION (all demographic fields)
- PARENT/GUARDIAN INFORMATION (Parent/Guardian 1 and 2)
- MEETING INFORMATION (dates, participants, meeting type)
- IEP TIMELINES (ETR dates, review dates)

**ALL NUMBERED SECTIONS (1-15):**
- "1. FUTURE PLANNING"
- "2. SPECIAL INSTRUCTIONAL FACTORS" 
- "3. PROFILE" (complete content across all pages)
- "4. EXTENDED SCHOOL YEAR SERVICES"
- "5. POSTSECONDARY TRANSITION"
- "6. MEASURABLE ANNUAL GOALS" (with PRESENT LEVEL and METHODS)
- "7. SPECIALLY DESIGNED SERVICES" (with GOAL ADDRESSED, BEGIN/END dates)
- "8. TRANSPORTATION"
- "9. NONACADEMIC AND EXTRACURRICULAR ACTIVITIES"
- "10. GENERAL FACTORS"
- "11. LEAST RESTRICTIVE ENVIRONMENT"
- "12. STATEWIDE AND DISTRICT WIDE TESTING"
- "13. MEETING PARTICIPANTS"
- "14. SIGNATURES"
- "15. AMENDMENTS"
- "16. IEP TEAM MEETING INFORMATION"
- "17. SIGNATURES"

**EXTRACTION RULES:**
1. Extract ALL sections even if they appear empty - use "" for missing text, [] for missing arrays
2. Use EXACT field names from schema ("CHILD'S INFORMATION", "PARENT/GUARDIAN INFORMATION", etc.)
3. For boolean fields, set true/false based on checkboxes or selections
4. Extract complete text content, don't summarize
5. Include all subsections and nested objects as defined in schema

**GOALS COMPLETENESS AND CONSISTENCY (CRITICAL):**
- Enumerate every goal block present in the PDF (e.g., "#1", "#2", etc.).
- Extract ALL goals across page breaks and behavior goals; do not stop at the first.
- After extracting services, cross-validate: if any service references "Goal Addressed #" = N, ensure GOALS contains a goal with NUMBER = N.
- If numbering is non-sequential or repeated, preserve the literal NUMBERs as shown and include all.

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

**🚨 CRITICAL FREQUENCY EXTRACTION:**
- For service frequencies, ALWAYS extract the complete frequency with numbers
- CORRECT: "2 times per week", "5 times per week", "daily", "3 times per month"
- WRONG: "per week", "weekly", "monthly" (missing the number)
- Look for patterns like "2x/week", "5 times weekly", "daily", "twice per week"
- **EXAMINE SERVICE TABLES CAREFULLY** - frequency numbers may be in separate columns or cells
- **CHECK FOR NUMERIC VALUES** near frequency text (e.g., "5" in one cell, "times per week" in another)
- **IF NO NUMBERS FOUND**, then use the text as-is, but look thoroughly first
- STREET, CITY, STATE, ZIP (split address)
- GENDER, GRADE, DISTRICT OF RESIDENCE, COUNTY OF RESIDENCE, DISTRICT OF SERVICE
- All boolean flags: preschool, age 14, transition info, ward of state, surrogate parent, Part C transition

2️⃣ PARENT/GUARDIAN INFORMATION:
- Parent/Guardian 1: NAME, STREET, CITY, STATE, ZIP, HOME PHONE, WORK PHONE, CELL PHONE, EMAIL
- Parent/Guardian 2: Same fields if present
- OTHER INFORMATION field

3️⃣ MEETING INFORMATION:
- MEETING DATE, MEETING TYPE checkboxes
- All participant information

4️⃣ IEP TIMELINES:
- ETR COMPLETION DATE, NEXT ETR DUE DATE
- All timeline dates

5️⃣ IEP EFFECTIVE DATES:
- START, END, DATE OF NEXT IEP REVIEW

6️⃣ SECTIONS 1-5:
- 1. FUTURE PLANNING (full narrative)
- 2. SPECIAL INSTRUCTIONAL FACTORS (all checkboxes)
- 3. PROFILE (all narrative sections)
- 4. EXTENDED SCHOOL YEAR SERVICES (decision and details)
- 5. POSTSECONDARY TRANSITION (all goals and assessments)

7️⃣ MEASURABLE ANNUAL GOALS:
- Wrap goals array in object with FREQUENCY OF WRITTEN PROGRESS REPORTING
- For each goal: NUMBER, AREA, PRESENT LEVEL..., MEASURABLE ANNUAL GOAL, METHOD(S) FOR MEASURING..., Objectives/Benchmarks
- Each objective: OBJECTIVE, EVALUATION PROCEDURES, SCHEDULE, DATE OF MASTERY

8️⃣ SPECIALLY DESIGNED SERVICES:
- For each service include: Description, Goal Addressed #, Provider Title, Location of Service, Begin Date, End Date, Amount of Time, Frequency
- **CRITICAL: For Frequency, extract the COMPLETE frequency including numbers (e.g., "2 times per week", "5 times per week", "daily") - never just "per week"**
- **CRITICAL: For Amount of Time, extract exact time values (e.g., "30 minutes", "60 minutes", "2 hours")**
- Split into: SPECIALLY DESIGNED INSTRUCTION, RELATED SERVICES, ACCOMMODATIONS, MODIFICATIONS, ASSISTIVE TECHNOLOGY, SUPPORT FOR SCHOOL PERSONNEL

9️⃣ SECTIONS 8-15:
- 8. TRANSPORTATION (all checkboxes and details)
- 9. LEAST RESTRICTIVE ENVIRONMENT (full justification)
- 10. TESTING AND EXEMPTIONS (all tables and accommodations)
- 11-15. All remaining sections including Meeting Participants and Signatures

🚨 QUALITY CHECKS:
- Verify all required sections are present
- Ensure no custom field names - use exact master schema names
- Split combined strings into discrete fields
- Extract complete service details with provider info
- Include all dates and boolean values
- Capture both parents if present

Extract EVERYTHING you see. This is a real IEP document with real data - extract it all!`;

  try {
    // Load the optimized form-specific schema (12k chars, all critical fields from canonical)
    const schemaPath = path.join(process.cwd(), 'the_schema_optimized.json');
    const formSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    console.log(`   - Uploading file to OpenAI...`);
    
    // Upload file to OpenAI for Responses API
    const file = await client.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'user_data'
    });

    console.log(`   - File uploaded with ID: ${file.id}`);
    console.log(`   - Calling OpenAI Responses API with form-specific schema...`);
    
    // Call OpenAI Responses API with proper file reference and complete master schema
    const response = await client.responses.create({
      model: MODEL,
      reasoning: {
        effort: reasoningEffort
      },
      input: [{
        role: "user",
        content: [
          {
            type: "input_file",
            file_id: file.id
          },
          {
            type: "input_text",
            text: prompt
          }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "complete_iep_extraction",
          strict: true,
          schema: formSchema
        }
      }
    });

    console.log(`   - Parsing response...`);
    
    // Clean up uploaded file
    await client.files.delete(file.id);
    
    // Parse the response
    console.log(`   - Raw response text: ${response.output_text.substring(0, 200)}...`);
    const extractedData = JSON.parse(response.output_text);
    
    // Calculate cost and usage
    const responseUsage = response.usage;
    const reasoningTokens = (responseUsage as any)?.reasoning_tokens || 0;
    // Try to detect cached input tokens from known fields if present
    const cachedInputTokens = (
      (responseUsage as any)?.input_cached_tokens ||
      (responseUsage as any)?.prompt_tokens_details?.cached_tokens ||
      0
    );
    const usage: ApiUsage = {
      prompt_tokens: responseUsage?.input_tokens || 0,
      completion_tokens: responseUsage?.output_tokens || 0,
      reasoning_tokens: reasoningTokens,
      total_tokens: (responseUsage?.input_tokens || 0) + (responseUsage?.output_tokens || 0) + reasoningTokens,
      cost_usd: calculate_cost(
        MODEL,
        responseUsage?.input_tokens || 0,
        responseUsage?.output_tokens || 0,
        cachedInputTokens
      )
    };

    console.log(`   - Tokens: ${usage.total_tokens} (${reasoningTokens} reasoning)`);
    console.log(`   - Cost: $${usage.cost_usd.toFixed(6)}`);
    console.log(`✅ Extraction completed successfully`);

    return {
      data: extractedData,
      usage,
      model: MODEL
    };

  } catch (error) {
    console.error(`   - Extraction failed: ${error}`);
    throw error;
  }
}
