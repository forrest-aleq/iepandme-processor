import OpenAI from 'openai';
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
    title: string;
    description: string;
  }>;
  services: Array<{
    serviceType: string;
    durationMinutes: number;
    frequency: string;
    provider: string;
    sessionLocation: string;
    sessionType: 'Individual' | 'Group';
    comments?: string | null;
  }>;
  standardizedAssessments: {
    districtAssessments: string[];
    languageAssessments: string[];
    physicalAssessments: string[];
    stateAssessments: string[];
  };
}

// Define schema locally with additionalProperties: false for OpenAI structured outputs
const IEP_SCHEMA = {
  "type": "object",
  "additionalProperties": false,
  "required": ["metadata", "studentInfo", "reviewDates", "caseManager", "presentLevels", "goals", "accommodations", "services", "standardizedAssessments"],
  "properties": {
    "metadata": {
      "type": "object",
      "additionalProperties": false,
      "required": ["schemaVersion", "source", "documentDate", "parsedAt"],
      "properties": {
        "schemaVersion": { "type": "string" },
        "source": { "type": "string" },
        "documentDate": { "type": ["string", "null"] },
        "parsedAt": { "type": "string" }
      }
    },
    "studentInfo": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "school", "grade", "gender", "studentId", "birthdate", "district", "homeAddress"],
      "properties": {
        "name": { "type": "string" },
        "school": { "type": "string" },
        "grade": { "type": "string" },
        "gender": { "type": "string", "enum": ["Male", "Female", "Non-Binary", "Other"] },
        "studentId": { "type": ["string", "null"] },
        "birthdate": { "type": "string" },
        "district": { "type": ["string", "null"] },
        "homeAddress": { "type": ["string", "null"] }
      }
    },
    "reviewDates": {
      "type": "object",
      "additionalProperties": false,
      "required": ["annualReview", "effectiveUntil"],
      "properties": {
        "annualReview": { "type": "string" },
        "effectiveUntil": { "type": "string" }
      }
    },
    "caseManager": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "email"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      }
    },
    "presentLevels": {
      "type": "object",
      "additionalProperties": false,
      "required": ["academics", "adaptiveDailyLivingSkills", "communicationDevelopment", "grossFineMotorDevelopment", "health", "socialEmotionalBehavioral", "vocational"],
      "properties": {
        "academics": { "type": "string" },
        "adaptiveDailyLivingSkills": { "type": "string" },
        "communicationDevelopment": { "type": "string" },
        "grossFineMotorDevelopment": { "type": "string" },
        "health": { "type": "string" },
        "socialEmotionalBehavioral": { "type": "string" },
        "vocational": { "type": "string" }
      }
    },
    "goals": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["goalArea", "goalTopic", "baseline", "description", "targetPercentage", "targetDate", "additionalGoalAreas", "shortTermObjectives"],
        "properties": {
          "goalArea": { "type": "string" },
          "goalTopic": { "type": "string" },
          "baseline": { "type": "string" },
          "description": { "type": "string" },
          "targetPercentage": { "type": ["number", "null"] },
          "targetDate": { "type": ["string", "null"] },
          "additionalGoalAreas": {
            "type": ["array", "null"],
            "items": { "type": "string" }
          },
          "shortTermObjectives": {
            "type": ["array", "null"],
            "items": { "type": "string" }
          }
        }
      }
    },
    "accommodations": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "description"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "services": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["serviceType", "durationMinutes", "frequency", "provider", "sessionLocation", "sessionType", "comments"],
        "properties": {
          "serviceType": { "type": "string" },
          "durationMinutes": { "type": "number" },
          "frequency": { "type": "string" },
          "provider": { "type": "string" },
          "sessionLocation": { "type": "string" },
          "sessionType": { "type": "string", "enum": ["Individual", "Group"] },
          "comments": { "type": ["string", "null"] }
        }
      }
    },
    "standardizedAssessments": {
      "type": "object",
      "additionalProperties": false,
      "required": ["districtAssessments", "languageAssessments", "physicalAssessments", "stateAssessments"],
      "properties": {
        "districtAssessments": {
          "type": "array",
          "items": { "type": "string" }
        },
        "languageAssessments": {
          "type": "array",
          "items": { "type": "string" }
        },
        "physicalAssessments": {
          "type": "array",
          "items": { "type": "string" }
        },
        "stateAssessments": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
};

// Initialize OpenAI client lazily
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * OpenAI o4-mini extraction with multimodal support and tool integration
 * Updated for o4-mini-2025-04-16 model specifications
 */

/**
 * Extract IEP data using o4-mini - fast, cost-efficient reasoning model
 * Best for standard IEP documents where speed and cost matter
 * Pricing: $1.10/$4.40 per million tokens (input/output)
 */
export async function extractWithO4Mini(documentText: string): Promise<{data: IEPData; usage?: ApiUsage}> {
  // o4-mini performs best with clear, structured prompts
  const prompt = `Extract all IEP (Individualized Education Program) information from the following document and return it as JSON.

Document:
${documentText}

JSON Schema:
${JSON.stringify(IEP_SCHEMA, null, 2)}

Instructions:
- Extract ALL information regardless of format or location
- Map data to appropriate schema fields
- Use null for missing fields
- Return only valid JSON

Output: Valid JSON matching the schema`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'o4-mini-2025-04-16',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 8000,
      response_format: { 
        type: "json_schema",
        json_schema: {
          name: "iep_extraction",
          strict: true,
          schema: IEP_SCHEMA
        }
      },
      reasoning_effort: "medium" // Balance speed and accuracy
      // Note: o4-mini reasoning models don't support temperature
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // Calculate cost based on usage
    const usage = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
      cost_usd: calculateO4MiniCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      )
    };

    return {
      data: JSON.parse(content) as IEPData,
      usage
    };
  } catch (error) {
    console.error('OpenAI o4-mini extraction failed:', error);
    throw error;
  }
}

/**
 * Extract IEP data using o4-mini-high - enhanced accuracy version
 * Best for complex IEP documents requiring higher accuracy
 * Only available to paid ChatGPT users via API
 */
export async function extractWithO4MiniHigh(documentText: string): Promise<{data: IEPData; usage?: ApiUsage}> {
  const prompt = `You are analyzing an IEP document. Extract ALL information and return as JSON.

Document to analyze:
${documentText}

Target JSON Schema:
${JSON.stringify(IEP_SCHEMA, null, 2)}

Requirements:
1. Thoroughly scan the entire document for relevant information
2. Handle various formats: tables, lists, paragraphs, headers
3. Standardize dates and formatting
4. Use semantic understanding to identify information without explicit labels
5. Return ONLY valid JSON matching the schema exactly`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'o4-mini-2025-04-16', // Same model but with high reasoning
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 10000, // Higher limit for complex documents
      response_format: { 
        type: "json_schema",
        json_schema: {
          name: "iep_extraction",
          strict: true,
          schema: IEP_SCHEMA
        }
      },
      reasoning_effort: "high" // Maximum accuracy
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // Calculate cost based on usage
    const usage = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
      cost_usd: calculateO4MiniCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      )
    };

    return {
      data: JSON.parse(content) as IEPData,
      usage
    };
  } catch (error) {
    console.error('OpenAI o4-mini-high extraction failed:', error);
    throw error;
  }
}

/**
 * Extract IEP data from images using o4-mini's multimodal capabilities
 * Supports JPEG, PNG, and WebP images
 * Requires base64-encoded image data
 */
export async function extractFromImageWithO4Mini(
  imageData: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
): Promise<{data: IEPData; usage?: ApiUsage}> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'o4-mini-2025-04-16',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${imageData}`
              }
            },
            {
              type: 'text',
              text: `Extract all IEP information from this document image.

Analyze the image carefully to:
1. Read all text accurately
2. Identify tables, forms, and structured data
3. Extract student info, disabilities, goals, accommodations, services
4. Handle handwritten portions if present

Return the extracted data as JSON matching this schema:
${JSON.stringify(IEP_SCHEMA, null, 2)}

Output only valid JSON. Use null for unreadable or missing information.`
            }
          ]
        }
      ],
      max_completion_tokens: 8000,
      response_format: { 
        type: "json_schema",
        json_schema: {
          name: "iep_extraction",
          strict: true,
          schema: IEP_SCHEMA
        }
      },
      reasoning_effort: "high" // Use high effort for OCR tasks
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // Calculate cost based on usage
    const usage = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
      cost_usd: calculateO4MiniCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      )
    };

    return {
      data: JSON.parse(content) as IEPData,
      usage
    };
  } catch (error) {
    console.error('OpenAI o4-mini image extraction failed:', error);
    throw error;
  }
}

/**
 * Intelligent extraction that chooses between o4-mini models based on requirements
 * Automatically selects standard or high reasoning based on document characteristics
 */
export async function extractWithOptimalO4Mini(
  documentText: string,
  options?: {
    forceHigh?: boolean;
    preferSpeed?: boolean;
    isImage?: boolean;
    imageData?: string;
    mediaType?: 'image/jpeg' | 'image/png' | 'image/webp';
  }
): Promise<{data: IEPData; usage?: ApiUsage}> {
  // Handle image extraction
  if (options?.isImage && options?.imageData) {
    console.log('Using o4-mini multimodal for image extraction');
    return extractFromImageWithO4Mini(options.imageData, options.mediaType);
  }

  // Decision logic for text extraction
  const wordCount = documentText.split(/\s+/).length;
  const hasComplexTables = /\t|\|/.test(documentText);
  const hasMixedFormats = /\d+\.\s+.*\n.*•\s+/.test(documentText); // Numbered + bulleted lists
  const hasLegalLanguage = /pursuant|hereinafter|whereas/i.test(documentText);
  
  // Use high reasoning for complex documents
  const useHigh = options?.forceHigh || 
    (!options?.preferSpeed && (
      wordCount > 3000 || 
      hasComplexTables || 
      hasMixedFormats ||
      hasLegalLanguage
    ));
  
  console.log(`Using o4-mini${useHigh ? '-high' : ''} for extraction (${wordCount} words)`);
  
  return useHigh 
    ? extractWithO4MiniHigh(documentText) 
    : extractWithO4Mini(documentText);
}

/**
 * Batch extraction for multiple IEP documents
 * Optimized for processing many documents efficiently
 */
export async function batchExtractWithO4Mini(
  documents: Array<{ id: string; text: string }>
): Promise<Array<{ id: string; data: IEPData | null; error?: string; usage?: ApiUsage }>> {
  const results = [];
  
  // Process in parallel with rate limiting
  const batchSize = 5; // Process 5 documents at a time
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (doc) => {
      try {
        const result = await extractWithO4Mini(doc.text);
        return { id: doc.id, data: result.data, usage: result.usage, error: undefined };
      } catch (error) {
        console.error(`Failed to extract document ${doc.id}:`, error);
        return { 
          id: doc.id, 
          data: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  return results;
}

/**
 * Cost estimation utility for o4-mini models
 * Helps predict API costs before processing
 */
export function estimateO4MiniCost(
  documentText: string,
  expectedOutputTokens: number = 2000
): { inputCost: number; outputCost: number; totalCost: number } {
  // Rough estimation: 1 token ≈ 0.75 words
  const inputTokens = Math.ceil(documentText.split(/\s+/).length / 0.75);
  
  // o4-mini pricing: $1.10 per million input tokens, $4.40 per million output tokens
  const inputCost = (inputTokens / 1_000_000) * 1.10;
  const outputCost = (expectedOutputTokens / 1_000_000) * 4.40;
  
  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number((inputCost + outputCost).toFixed(6))
  };
}

/**
 * Calculate cost for o4-mini based on actual token usage
 */
export function calculateO4MiniCost(
  promptTokens: number,
  completionTokens: number
): number {
  // o4-mini pricing: $1.10 per million input tokens, $4.40 per million output tokens
  const inputCost = (promptTokens / 1_000_000) * 1.10;
  const outputCost = (completionTokens / 1_000_000) * 4.40;
  
  return Number((inputCost + outputCost).toFixed(6));
}

// Define ApiUsage interface
export interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}
