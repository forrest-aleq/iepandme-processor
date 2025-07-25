import fs from 'fs';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { IEPData } from '../types';

// Configure environment variables
dotenv.config();

// Setup OpenAI client
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface ApiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  reasoningTokens?: number;
}

/**
 * Calculate cost for OpenAI o4-mini with reasoning tokens
 */
function calculateO4MiniCostWithReasoning(
  promptTokens: number,
  completionTokens: number,
  reasoningTokens: number = 0
): number {
  // o4-mini pricing: $1.10 per million input tokens, $4.40 per million output tokens
  // Reasoning tokens are billed as output tokens
  const inputCost = (promptTokens / 1_000_000) * 1.10;
  const outputCost = ((completionTokens + reasoningTokens) / 1_000_000) * 4.40;
  
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * IMPROVED IEP extraction using o4-mini via Responses API with form-aware prompting
 * Addresses checkbox detection and form vs content confusion
 */
export async function extractWithImprovedO4MiniResponses(
  filePath: string,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  const client = getOpenAIClient();
  
  try {
    // Upload file to OpenAI
    console.log('   - Uploading file to OpenAI...');
    const file = await client.files.create({
      file: fs.createReadStream(filePath),
      purpose: "user_data",
    });
    
    console.log(`   - File uploaded with ID: ${file.id}`);
    
    // Create the improved IEP-specific extraction prompt
    const prompt = `You are an expert IEP document analyst with deep understanding of special education forms and documents.

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

## EXAMPLES OF WHAT TO AVOID:

❌ WRONG - Extracting all checkbox options:
"progress_measures": ["Curriculum-Based Assessment", "Portfolios", "Observation", "Anecdotal Records", "Short-Cycle Assessments", "Performance Assessments", "Checklists", "Running Records", "Work Samples", "Inventories", "Rubrics"]

✅ CORRECT - Only extracting checked items:
"progress_measures": ["Curriculum-Based Assessment", "Observation", "Running Records"]

❌ WRONG - Partial baseline:
"baseline": "Carter scored at kindergarten level..."

✅ CORRECT - Complete baseline:
"baseline": "Carter scored at kindergarten level in phonics with 2nd percentile performance. He recognizes upper and lowercase letters, matches consonant sounds s, f, r, m, p, l, t, d, n, g, b, c, h in isolation, and matches short vowel sounds a and i. He demonstrates difficulty with blending sounds and needs support for CVC word reading."

## OUTPUT REQUIREMENTS:

Return structured JSON with:
- Only data that is actually filled in the document
- Complete text for baselines and present levels (no truncation)
- Only selected progress monitoring methods
- Actual service frequencies (note when missing)
- Clear distinction between goals and objectives
- Null values for truly missing information

Be extremely careful to extract ACTUAL DATA, not form templates or option lists.`;

    // Use Responses API with reasoning and structured outputs
    console.log(`   - Processing with reasoning effort: ${reasoningEffort}...`);
    const response = await client.responses.create({
      model: "o4-mini",
      reasoning: { 
        effort: reasoningEffort,
        summary: "auto" // Get reasoning summary for debugging
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: file.id,
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "iep_extraction_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              metadata: {
                type: "object",
                properties: {
                  schemaVersion: { type: "string" },
                  source: { type: "string" },
                  documentDate: { type: "string" },
                  parsedAt: { type: "string" }
                },
                required: ["schemaVersion", "source", "parsedAt"],
                additionalProperties: false
              },
              studentInfo: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  school: { type: "string" },
                  grade: { type: "string" },
                  gender: { type: "string", enum: ["Male", "Female", "Non-Binary", "Other"] },
                  studentId: { type: "string" },
                  birthdate: { type: "string" },
                  district: { type: "string" },
                  homeAddress: { type: "string" }
                },
                required: ["name", "school", "grade", "gender", "birthdate"],
                additionalProperties: false
              },
              reviewDates: {
                type: "object",
                properties: {
                  annualReview: { type: "string" },
                  effectiveUntil: { type: "string" }
                },
                required: ["annualReview", "effectiveUntil"],
                additionalProperties: false
              },
              caseManager: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" }
                },
                required: ["name", "email"],
                additionalProperties: false
              },
              presentLevels: {
                type: "object",
                properties: {
                  academics: { type: "string" },
                  adaptiveDailyLivingSkills: { type: "string" },
                  communicationDevelopment: { type: "string" },
                  grossFineMotorDevelopment: { type: "string" },
                  health: { type: "string" },
                  socialEmotionalBehavioral: { type: "string" },
                  vocational: { type: "string" }
                },
                required: ["academics", "adaptiveDailyLivingSkills", "communicationDevelopment", "grossFineMotorDevelopment", "health", "socialEmotionalBehavioral", "vocational"],
                additionalProperties: false
              },
              goals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goalArea: { type: "string" },
                    goalTopic: { type: "string" },
                    baseline: { type: "string" },
                    description: { type: "string" },
                    targetPercentage: { type: "number" },
                    targetDate: { type: "string" },
                    additionalGoalAreas: { type: "array", items: { type: "string" } },
                    shortTermObjectives: { type: "array", items: { type: "string" } }
                  },
                  required: ["goalArea", "goalTopic", "baseline", "description"],
                  additionalProperties: false
                }
              },
              accommodations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    description: { type: "string" },
                    settings: { type: "array", items: { type: "string" } },
                    subjects: { type: "array", items: { type: "string" } }
                  },
                  required: ["category", "description", "settings", "subjects"],
                  additionalProperties: false
                }
              },
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    provider: { type: "string" },
                    frequency: { type: "string" },
                    duration: { type: "string" },
                    location: { type: "string" }
                  },
                  required: ["type", "provider", "frequency", "duration", "location"],
                  additionalProperties: false
                }
              },
              standardizedAssessments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    date: { type: "string" },
                    scores: { type: "object" }
                  },
                  required: ["name", "date", "scores"],
                  additionalProperties: false
                }
              }
            },
            required: ["metadata", "studentInfo", "reviewDates", "caseManager", "presentLevels", "goals", "accommodations", "services", "standardizedAssessments"],
            additionalProperties: false
          }
        }
      },
      max_output_tokens: 8000, // Reserve space for reasoning + output
    });

    // Clean up the uploaded file
    try {
      await client.files.delete(file.id);
      console.log(`   - Cleaned up uploaded file: ${file.id}`);
    } catch (cleanupError) {
      console.warn(`   - Warning: Could not delete uploaded file ${file.id}:`, cleanupError);
    }

    // Extract the response content
    const content = response.output?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // Log reasoning summary if available
    if (response.reasoning?.summary) {
      console.log(`   - Reasoning summary: ${response.reasoning.summary.substring(0, 200)}...`);
    }

    // Parse the JSON response
    let extractedData: IEPData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('   - JSON parsing failed:', parseError);
      console.error('   - Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }

    // Calculate usage and cost
    const usage: ApiUsage = {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      reasoningTokens: response.usage?.reasoning_tokens || 0,
      cost: calculateO4MiniCostWithReasoning(
        response.usage?.input_tokens || 0,
        response.usage?.output_tokens || 0,
        response.usage?.reasoning_tokens || 0
      )
    };

    console.log(`   - Token usage: ${usage.promptTokens} prompt + ${usage.completionTokens} completion + ${usage.reasoningTokens} reasoning = ${usage.totalTokens} total`);
    console.log(`   - Estimated cost: $${usage.cost}`);

    return {
      data: extractedData,
      usage,
      model: 'o4-mini-2025-04-16-improved'
    };

  } catch (error) {
    console.error('   - Extraction failed:', error);
    throw error;
  }
}
