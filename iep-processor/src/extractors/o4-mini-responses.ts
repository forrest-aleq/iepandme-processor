import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define types locally to avoid import issues
interface IEPData {
  metadata: {
    schemaVersion: string;
    source: string;
    documentDate?: string;
    parsedAt: string;
  };
  studentInfo: {
    name: string;
    school: string;
    grade: string;
    gender: 'Male' | 'Female' | 'Non-Binary' | 'Other';
    studentId?: string | null;
    birthdate: string;
    district?: string | null;
    homeAddress?: string | null;
  };
  reviewDates: {
    annualReview: string;
    effectiveUntil: string;
  };
  caseManager: {
    name: string;
    email: string;
  };
  presentLevels: {
    academics: string;
    adaptiveDailyLivingSkills: string;
    communicationDevelopment: string;
    grossFineMotorDevelopment: string;
    health: string;
    socialEmotionalBehavioral: string;
    vocational: string;
  };
  goals: Array<{
    goalArea: string;
    goalTopic: string;
    baseline: string;
    description: string;
    targetPercentage?: number;
    targetDate?: string;
    additionalGoalAreas?: string[] | null;
    shortTermObjectives?: string[] | null;
  }>;
  accommodations: Array<{
    category: string;
    description: string;
    settings: string[];
    subjects: string[];
  }>;
  services: Array<{
    type: string;
    provider: string;
    frequency: string;
    duration: string;
    location: string;
  }>;
  standardizedAssessments: Array<{
    name: string;
    date: string;
    scores: Record<string, any>;
  }>;
}

interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  reasoning_tokens?: number;
}

// Initialize OpenAI client lazily
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * Calculate cost for o4-mini based on actual token usage including reasoning tokens
 */
function calculateO4MiniCost(
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
 * Extract IEP data using o4-mini via Responses API with direct file input
 * Uses reasoning capabilities and direct PDF processing
 */
export async function extractWithO4MiniResponses(
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
    
    // Create the extraction prompt
    const prompt = `You are analyzing an IEP (Individualized Education Program) document. Extract ALL information and return as structured JSON.

CRITICAL REQUIREMENTS:
1. Extract ALL student information, goals, accommodations, services, and assessments
2. For goals: include baseline, description, target percentage, and target date
3. For accommodations: categorize by type (instructional, assessment, behavioral, etc.)
4. For services: include type, provider, frequency, duration, and location
5. Use exact text from document - do not paraphrase or summarize
6. If information is missing, use empty string "" or empty array []
7. Ensure all dates are in YYYY-MM-DD format where possible

The response must be valid JSON matching the IEP data structure. Be thorough and accurate.`;

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
                required: ["schemaVersion", "source", "documentDate", "parsedAt"],
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
                  homeAddress: { type: "string" },
                  parent_guardian: { type: "string" },
                  parent_contact: { type: "string" },
                  disability_category: { type: "array", items: { type: "string" } },
                  eligibility_date: { type: "string" },
                  iep_date: { type: "string" },
                  iep_review_date: { type: "string" }
                },
                required: ["name", "school", "grade", "gender", "studentId", "birthdate", "district", "homeAddress", "parent_guardian", "parent_contact", "disability_category", "eligibility_date", "iep_date", "iep_review_date"],
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
                    shortTermObjectives: { type: "array", items: { type: "string" } },
                    progress_measures: { type: "array", items: { type: "string" } }
                  },
                  required: ["goalArea", "goalTopic", "baseline", "description", "targetPercentage", "targetDate", "additionalGoalAreas", "shortTermObjectives", "progress_measures"],
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
                    scores: { 
                      type: "object",
                      properties: {
                        raw: { type: "string" },
                        percentile: { type: "string" },
                        standardScore: { type: "string" },
                        gradeEquivalent: { type: "string" }
                      },
                      required: ["raw", "percentile", "standardScore", "gradeEquivalent"],
                      additionalProperties: false
                    }
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

    // Clean up uploaded file
    try {
      await client.files.delete(file.id);
    } catch (cleanupError) {
      console.warn('   - Warning: Could not delete uploaded file:', cleanupError);
    }

    // Extract the response text
    let extractedText = '';
    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'message' && 'content' in item) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              extractedText += content.text;
            }
          }
        }
      }
    }

    // Parse JSON from response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in o4-mini response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Calculate usage and cost
    const usage = response.usage;
    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;
    const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateO4MiniCost(inputTokens, outputTokens - reasoningTokens, reasoningTokens);

    // Log reasoning summary if available
    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'reasoning' && 'summary' in item && item.summary) {
          console.log('   - Reasoning summary available (use for debugging)');
        }
      }
    }

    return {
      data: extractedData as IEPData,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens - reasoningTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        reasoning_tokens: reasoningTokens
      },
      model: 'o4-mini-2025-04-16-responses'
    };

  } catch (error) {
    console.error('o4-mini Responses API extraction failed:', error);
    throw error;
  }
}

/**
 * Extract IEP data using o4-mini via Responses API with Base64 file input
 * Alternative method that doesn't require file upload
 */
export async function extractWithO4MiniResponsesBase64(
  filePath: string,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  const client = getOpenAIClient();
  
  try {
    // Read and encode file as Base64
    console.log('   - Reading and encoding file...');
    const fileData = fs.readFileSync(filePath);
    const base64String = fileData.toString('base64');
    const fileName = path.basename(filePath);
    
    // Create the extraction prompt
    const prompt = `You are an expert IEP document analyst. Extract ONLY the actual filled-in data from this IEP document.

CRITICAL EXTRACTION RULES:

1. **PROGRESS MONITORING METHODS**: 
   - Look for checkboxes with or marks
   - ONLY extract the ones that are CHECKED, not the entire list
   - If you see 11 options but only 3 are checked, extract only those 3

2. **SERVICE FREQUENCIES**: 
   - Extract EXACT numbers: "2 times per week", "30 minutes", "1 time per week"
   - DO NOT extract just "per week" - get the actual frequency numbers
   - Look for filled-in numbers in frequency fields

3. **BASELINE PERFORMANCE**: 
   - Extract ACTUAL PERFORMANCE DATA: test scores, percentiles, grade levels
   - NOT intervention instructions or teaching methods
   - Look for phrases like "scored at", "percentile", "grade level", "assessment results"

4. **STUDENT INFORMATION**: 
   - Extract parent/guardian name and contact information
   - Extract disability category (e.g., "Intellectual Disabilities")
   - Extract eligibility date and IEP dates
   - Look for complete demographic information

5. **FORM VS CONTENT AWARENESS**:
   - Ignore blank template fields (______)
   - Don't extract field labels like "Student Name:"
   - Extract only filled-in actual data

## SPECIFIC FIELD REQUIREMENTS:

**Student Info**: name, school, grade, gender, studentId, birthdate, district, homeAddress, parent_guardian, parent_contact, disability_category, eligibility_date, iep_date, iep_review_date

**Goals**: For each goal extract goalArea, baseline (PERFORMANCE DATA), description, progress_measures (ONLY CHECKED ITEMS), shortTermObjectives

**Services**: type, provider, frequency (WITH NUMBERS), duration, location

Return structured JSON with complete, accurate data extraction.`;

    // Use Responses API with reasoning
    console.log(`   - Processing with reasoning effort: ${reasoningEffort}...`);
    const response = await client.responses.create({
      model: "o4-mini",
      reasoning: { 
        effort: reasoningEffort,
        summary: "auto"
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${base64String}`,
            },
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      max_output_tokens: 8000,
    });

    // Extract the response text
    let extractedText = '';
    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'message' && 'content' in item) {
          for (const content of item.content) {
            if (content.type === 'output_text') {
              extractedText += content.text;
            }
          }
        }
      }
    }

    // Parse JSON from response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in o4-mini response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Calculate usage and cost
    const usage = response.usage;
    const inputTokens = usage?.input_tokens || 0;
    const outputTokens = usage?.output_tokens || 0;
    const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateO4MiniCost(inputTokens, outputTokens - reasoningTokens, reasoningTokens);

    return {
      data: extractedData as IEPData,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens - reasoningTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        reasoning_tokens: reasoningTokens
      },
      model: 'o4-mini-2025-04-16-responses-base64'
    };

  } catch (error) {
    console.error('o4-mini Responses API (Base64) extraction failed:', error);
    throw error;
  }
}

/**
 * Smart extraction that chooses optimal reasoning effort based on document characteristics
 */
export async function extractWithO4MiniResponsesSmart(
  filePath: string,
  options?: {
    forceEffort?: 'low' | 'medium' | 'high';
    useBase64?: boolean;
  }
): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  
  // Determine reasoning effort based on file size and complexity
  let reasoningEffort: 'low' | 'medium' | 'high' = 'medium';
  
  if (options?.forceEffort) {
    reasoningEffort = options.forceEffort;
  } else {
    // Smart effort selection based on file size
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB < 1) {
      reasoningEffort = 'low';    // Small files - fast processing
    } else if (fileSizeMB > 5) {
      reasoningEffort = 'high';   // Large files - thorough reasoning
    } else {
      reasoningEffort = 'medium'; // Medium files - balanced approach
    }
  }
  
  console.log(`   - Auto-selected reasoning effort: ${reasoningEffort} (file size: ${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)}MB)`);
  
  // Choose extraction method
  if (options?.useBase64) {
    return extractWithO4MiniResponsesBase64(filePath, reasoningEffort);
  } else {
    return extractWithO4MiniResponses(filePath, reasoningEffort);
  }
}
