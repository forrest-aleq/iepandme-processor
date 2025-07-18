/**
 * IEP and Me - IEP Document Processor
 * 
 * This module provides functions to extract structured data from IEP documents
 * using AI models from OpenAI (o4-mini) and Anthropic (Claude).
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import PdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configure environment variables
dotenv.config();

// Setup API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Type definitions
export interface Goal {
  area: string;
  description: string;
  baseline: string;
  target: string;
  progress_measures: string[];
  services: string[];
}

export interface Accommodation {
  category: string;
  description: string;
  settings: string[];
  subjects: string[];
}

export interface Service {
  type: string;
  provider: string;
  frequency: string;
  duration: string;
  location: string;
  start_date?: string;
  end_date?: string;
}

export interface StudentInfo {
  name: string;
  id?: string;
  grade?: string;
  school?: string;
  district?: string;
  dob?: string;
  age?: string;
  disability_category?: string[];
  eligibility_date?: string;
  iep_date?: string;
  iep_review_date?: string;
  parent_guardian?: string;
  parent_contact?: string;
}

export interface PresentLevels {
  [key: string]: string;
}

export interface IEPData {
  studentInfo: StudentInfo;
  goals?: Goal[];
  accommodations?: Accommodation[];
  services?: Service[];
  presentLevels?: PresentLevels;
  transitionPlan?: string;
  behaviorPlan?: string;
  placementJustification?: string;
  assessmentAccommodations?: string[];
  teamMembers?: string[];
  additionalNotes?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExtractionMetadata {
  claude_confidence?: number;
  o4_mini_confidence?: number; 
  fields_matched?: number;
  fields_conflicted?: string[];
  consensus_used?: string;
}

export interface ConsensusResult {
  data: IEPData;
  extraction_metadata: ExtractionMetadata;
}

export interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: IEPData;
  error?: string;
  metadata: {
    validation?: ValidationResult;
    processing_time: string;
    models_used: string[];
    claude_confidence?: number;
    o4_mini_confidence?: number;
  };
  raw_results?: {
    claude: any;
    o4_mini: any;
  };
  usage?: ApiUsage;
}

/**
 * IEP JSON Schema for validation
 */
export const IEP_SCHEMA = {
  required: ['studentInfo'],
  properties: {
    studentInfo: {
      required: ['name'],
      properties: {
        name: { type: 'string' }
      }
    }
  }
};

/**
 * Extract text from PDF, DOCX, or TXT document
 */
async function extractDocumentText(filePath: string, fileType: string = 'txt'): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  switch (fileType.toLowerCase()) {
    case 'pdf':
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await PdfParse(dataBuffer);
      return pdfData.text;
    
    case 'docx':
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    
    case 'txt':
      return fs.readFileSync(filePath, 'utf8');
    
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract IEP data using Claude 4 Opus
 */
export async function extractWithClaude4(documentText: string): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  const prompt = `You are analyzing an IEP document. Extract ALL information and return as JSON.
                  Include student info, goals, accommodations, services, present levels, and other key sections.
                  Format goal 'target' as a clear, measurable outcome statement.
                  Organize accommodations by category.
                  For services, include provider, frequency, duration, and location.
                  Only include information that is explicitly stated in the document.
                  
                  Return in this JSON structure:
                  {
                    "studentInfo": {
                      "name": "",
                      "id": "",
                      "grade": "",
                      "school": "",
                      "district": "",
                      "dob": "",
                      "age": "",
                      "disability_category": [],
                      "eligibility_date": "",
                      "iep_date": "",
                      "iep_review_date": "",
                      "parent_guardian": "",
                      "parent_contact": ""
                    },
                    "goals": [
                      {
                        "area": "",
                        "description": "",
                        "baseline": "",
                        "target": "",
                        "progress_measures": [],
                        "services": []
                      }
                    ],
                    "accommodations": [
                      {
                        "category": "",
                        "description": "",
                        "settings": [],
                        "subjects": []
                      }
                    ],
                    "services": [
                      {
                        "type": "",
                        "provider": "",
                        "frequency": "",
                        "duration": "",
                        "location": ""
                      }
                    ],
                    "presentLevels": {
                      "academic": "",
                      "functional": "",
                      "social": ""
                    },
                    "transitionPlan": "",
                    "behaviorPlan": "",
                    "placementJustification": "",
                    "assessmentAccommodations": [],
                    "teamMembers": [],
                    "additionalNotes": ""
                  }

                  IEP document text:
                  ${documentText}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514', // Using Claude 4 Opus
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    // Extract JSON from response
    let content = '';
    if (response.content && response.content.length > 0) {
      // Handle both text and tool_use blocks
      if ('text' in response.content[0]) {
        content = response.content[0].text;
      } else if ('tool_use' in response.content[0]) {
        const toolUse = response.content[0].tool_use as any;
        content = toolUse?.input || '';
      }
    }
    
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : content as string;
    
    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      // Try fallback - look for first { and last }
      const startIdx = (content as string).indexOf('{');
      const endIdx = (content as string).lastIndexOf('}');
      if (startIdx > -1 && endIdx > -1) {
        const jsonSubstring = (content as string).substring(startIdx, endIdx + 1);
        return JSON.parse(jsonSubstring);
      }
      throw new Error(`Could not parse Claude response as JSON: ${parseError}`);
    }
  } catch (error) {
    console.error('Claude 4 Opus extraction failed:', error);
    throw error;
  }
}

/**
 * Extract IEP data using Claude 4 Sonnet
 */
export async function extractWithClaude4Sonnet(documentText: string): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  const prompt = `Extract structured IEP data from the following document. Return ONLY valid JSON matching this exact schema:

                  {
                    "studentInfo": {
                      "name": "",
                      "id": "",
                      "grade": "",
                      "school": "",
                      "district": "",
                      "dob": "",
                      "age": "",
                      "disability_category": [],
                      "eligibility_date": "",
                      "iep_date": "",
                      "iep_review_date": "",
                      "parent_guardian": "",
                      "parent_contact": ""
                    },
                    "goals": [
                      {
                        "area": "",
                        "description": "",
                        "baseline": "",
                        "target": "",
                        "progress_measures": [],
                        "services": []
                      }
                    ],
                    "accommodations": [
                      {
                        "category": "",
                        "description": "",
                        "settings": [],
                        "subjects": []
                      }
                    ],
                    "services": [
                      {
                        "type": "",
                        "provider": "",
                        "frequency": "",
                        "duration": "",
                        "location": ""
                      }
                    ],
                    "presentLevels": {
                      "academic": "",
                      "functional": "",
                      "social": ""
                    },
                    "transitionPlan": "",
                    "behaviorPlan": "",
                    "placementJustification": "",
                    "assessmentAccommodations": [],
                    "teamMembers": [],
                    "additionalNotes": ""
                  }

                  IEP document text:
                  ${documentText}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Using Claude 4 Sonnet
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    // Extract JSON from response
    let content = '';
    if (response.content && response.content.length > 0) {
      // Handle both text and tool_use blocks
      if ('text' in response.content[0]) {
        content = response.content[0].text;
      } else if ('tool_use' in response.content[0]) {
        const toolUse = response.content[0].tool_use as any;
        content = toolUse.input ? JSON.stringify(toolUse.input) : '';
      }
    }

    // Clean and parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude 4 Sonnet response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Calculate usage and cost
    const inputTokens = response.usage?.input_tokens || Math.ceil(documentText.length / 4);
    const outputTokens = response.usage?.output_tokens || Math.ceil(content.length / 4);
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateClaude4SonnetCost(inputTokens, outputTokens);
    
    return {
      data: extractedData as IEPData,
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: cost
      },
      model: 'claude-sonnet-4-20250514'
    };

  } catch (error) {
    console.error('Claude 4 Sonnet extraction failed:', error);
    throw error;
  }
}

/**
 * Extract IEP data using OpenAI o4-mini
 */
export async function extractWithO4MiniHigh(documentText: string): Promise<{data: IEPData; usage?: ApiUsage; model: string}> {
  const prompt = `You are analyzing an IEP document. Extract ALL information and return as JSON.
                  Include student info, goals, accommodations, services, present levels, and other key sections.
                  Format goal 'target' as a clear, measurable outcome statement.
                  Organize accommodations by category.
                  For services, include provider, frequency, duration, and location.
                  Only include information that is explicitly stated in the document.
                  
                  Return in this JSON structure:
                  {
                    "studentInfo": {
                      "name": "",
                      "id": "",
                      "grade": "",
                      "school": "",
                      "district": "",
                      "dob": "",
                      "age": "",
                      "disability_category": [],
                      "eligibility_date": "",
                      "iep_date": "",
                      "iep_review_date": "",
                      "parent_guardian": "",
                      "parent_contact": ""
                    },
                    "goals": [
                      {
                        "area": "",
                        "description": "",
                        "baseline": "",
                        "target": "",
                        "progress_measures": [],
                        "services": []
                      }
                    ],
                    "accommodations": [
                      {
                        "category": "",
                        "description": "",
                        "settings": [],
                        "subjects": []
                      }
                    ],
                    "services": [
                      {
                        "type": "",
                        "provider": "",
                        "frequency": "",
                        "duration": "",
                        "location": ""
                      }
                    ],
                    "presentLevels": {
                      "academic": "",
                      "functional": "",
                      "social": ""
                    },
                    "transitionPlan": "",
                    "behaviorPlan": "",
                    "placementJustification": "",
                    "assessmentAccommodations": [],
                    "teamMembers": [],
                    "additionalNotes": ""
                  }

                  IEP document text:
                  ${documentText}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });
    
    const result = {
      data: JSON.parse(response.choices[0].message.content || '{}'),
      model: 'o4-mini-high', // Using o4-mini-high naming for consistency
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
        cost_usd: (
          (response.usage?.prompt_tokens || 0) * 0.00001 + // $0.01/1000 tokens for prompt 
          (response.usage?.completion_tokens || 0) * 0.00003 // $0.03/1000 tokens for completion
        )
      }
    };
    
    return result;
  } catch (error) {
    console.error('OpenAI extraction error:', error);
    throw error;
  }
}

/**
 * Calculate cost for Claude 4 Opus usage
 */
function calculateClaude4OpusCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_MILLION = 15.0; // $15 per million tokens
  const OUTPUT_COST_PER_MILLION = 75.0; // $75 per million tokens
  
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + outputCost;
}

/**
 * Calculate cost for Claude 4 Sonnet usage
 */
function calculateClaude4SonnetCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_MILLION = 3.0; // $3 per million tokens
  const OUTPUT_COST_PER_MILLION = 15.0; // $15 per million tokens
  
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  
  return inputCost + outputCost;
}

/**
 * Calculate confidence score for extracted data with enhanced robustness
 */
function calculateConfidence(data: IEPData): number {
  let score = 0;
  let total = 100; // Base total out of 100
  let penalties = 0;
  
  // Core data presence (60 points total)
  if (data.studentInfo?.name) {
    score += 25;
    // Bonus for complete student info
    if (data.studentInfo.grade && data.studentInfo.school) score += 5;
  } else {
    penalties += 20; // Major penalty for missing student name
  }
  
  // Goals quality assessment (25 points)
  if (data.goals && data.goals.length > 0) {
    score += 15;
    
    // Quality checks for goals
    const completeGoals = data.goals.filter(g => 
      g.description && g.baseline && g.target
    ).length;
    const goalCompleteness = completeGoals / data.goals.length;
    score += Math.round(goalCompleteness * 10);
    
    // Penalty for suspiciously few or many goals
    if (data.goals.length < 2) penalties += 5;
    if (data.goals.length > 8) penalties += 3;
    
    // Penalty for vague/generic goals
    const vagueGoals = data.goals.filter(g => 
      g.description && (g.description.length < 20 || 
      g.description.includes('will improve') && g.description.length < 50)
    ).length;
    penalties += vagueGoals * 3;
  } else {
    penalties += 15; // Major penalty for no goals
  }
  
  // Accommodations assessment (10 points)
  if (data.accommodations && data.accommodations.length > 0) {
    score += 8;
    // Bonus for detailed accommodations
    const detailedAccommodations = data.accommodations.filter(a => 
      a.description && a.description.length > 10
    ).length;
    score += Math.min(detailedAccommodations, 2);
  }
  
  // Services assessment (10 points)
  if (data.services && data.services.length > 0) {
    score += 8;
    // Bonus for complete service info
    const completeServices = data.services.filter(s => 
      s.frequency && s.duration && s.provider
    ).length;
    score += Math.min(completeServices, 2);
  }
  
  // Present levels assessment (5 points)
  if (data.presentLevels && Object.keys(data.presentLevels).length > 0) {
    score += 5;
  }
  
  // Additional quality checks
  // Penalty for missing critical dates
  if (data.studentInfo && !data.studentInfo.iep_date) penalties += 3;
  
  // Calculate final score with penalties
  const finalScore = Math.max(0, score - penalties);
  
  // Cap confidence at 95% to account for inherent uncertainty
  return Math.min(finalScore, 95);
}

/**
 * Compare results from different models and create consensus
 */
function compareAndMerge(claudeData: IEPData | null, o4MiniData: IEPData | null): ConsensusResult {
  const consensus: ConsensusResult = {
    extraction_metadata: {
      claude_confidence: claudeData ? calculateConfidence(claudeData) : 0,
      o4_mini_confidence: o4MiniData ? calculateConfidence(o4MiniData) : 0,
      fields_matched: 0,
      fields_conflicted: [],
      consensus_used: 'hybrid'
    },
    data: {} as IEPData
  };
  
  // Use the data with higher confidence
  if (!claudeData) {
    consensus.data = o4MiniData as IEPData;
    consensus.extraction_metadata.consensus_used = 'o4-mini-only';
  } else if (!o4MiniData) {
    consensus.data = claudeData;
    consensus.extraction_metadata.consensus_used = 'claude-only';
  } else if ((consensus.extraction_metadata.claude_confidence || 0) > (consensus.extraction_metadata.o4_mini_confidence || 0)) {
    consensus.data = claudeData;
    consensus.extraction_metadata.consensus_used = 'claude-preferred';
  } else {
    consensus.data = o4MiniData;
    consensus.extraction_metadata.consensus_used = 'o4-mini-preferred';
  }
  
  return consensus;
}

/**
 * Validate the extracted IEP data
 */
export function validateIEPData(data: IEPData): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  // Required field validation
  if (!data.studentInfo || !data.studentInfo.name) {
    result.valid = false;
    result.errors.push('Missing student name');
  }
  
  // Goals validation
  if (!data.goals || data.goals.length === 0) {
    result.warnings.push('No goals found');
  } else {
    data.goals.forEach((goal, index) => {
      if (!goal.target) {
        result.warnings.push(`Goal #${index + 1} is missing a measurable target`);
      }
    });
  }
  
  // Services validation
  if (!data.services || data.services.length === 0) {
    result.warnings.push('No services found');
  }
  
  // Accommodations validation
  if (!data.accommodations || data.accommodations.length === 0) {
    result.warnings.push('No accommodations found');
  }
  
  return result;
}

/**
 * Main processing function with enhanced logging
 */
export async function processIEPDocument(filePath: string, fileType: string = 'txt'): Promise<ProcessingResult> {
  console.log(`🔄 Processing IEP document: ${filePath}`);
  const processingStart = Date.now();
  
  try {
    // Step 1: Extract text from document
    console.log('📄 Extracting document text...');
    const textStart = Date.now();
    const documentText = await extractDocumentText(filePath, fileType);
    console.log(`   - Text extraction completed in ${((Date.now() - textStart) / 1000).toFixed(2)}s`);
    console.log(`   - Document length: ${documentText.length} characters`);
    
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document text extraction failed or resulted in empty text');
    }

    // Step 2: Try file-based extraction first (for PDFs)
    let extractionResult = null;
    let claudeResult = null;
    let finalData = null;
    let finalUsage: ApiUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0
    };
    
    const extraction_metadata: ExtractionMetadata = {};
    
    // Step 3: Use text-based extraction
    console.log('🧠 Extracting data from document text...');
    
    // Model selection - easily switch for testing
    const PRIMARY_MODEL = process.env.PRIMARY_MODEL || 'o4-mini'; // Options: 'o4-mini', 'claude', 'claude-sonnet'
    const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'claude';
    
    const processStart = Date.now();
    
    // Try primary model first
    if (PRIMARY_MODEL === 'claude') {
      console.log('   - Attempting extraction with Claude 4 Opus...');
      try {
        const claudeExtraction = await extractWithClaude4(documentText);
        claudeResult = claudeExtraction.data;
        if (claudeExtraction.usage) {
          finalUsage = claudeExtraction.usage;
        }
        console.log(`   - Claude 4 Opus extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
      } catch (err) {
        console.warn('   - Claude 4 Opus extraction failed, falling back to o4-mini:', err);
        try {
          extractionResult = await extractWithO4MiniHigh(documentText);
          if (extractionResult?.usage) {
            finalUsage = extractionResult.usage;
          }
          console.log(`   - o4-mini extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
        } catch (fallbackErr) {
          console.error('   - o4-mini extraction also failed:', fallbackErr);
          throw new Error('All extraction methods failed');
        }
      }
    } else if (PRIMARY_MODEL === 'claude-sonnet') {
      console.log('   - Attempting extraction with Claude 4 Sonnet...');
      try {
        const claudeExtraction = await extractWithClaude4Sonnet(documentText);
        claudeResult = claudeExtraction.data;
        if (claudeExtraction.usage) {
          finalUsage = claudeExtraction.usage;
        }
        console.log(`   - Claude 4 Sonnet extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
      } catch (err) {
        console.warn('   - Claude 4 Sonnet extraction failed, falling back to o4-mini:', err);
        try {
          extractionResult = await extractWithO4MiniHigh(documentText);
          if (extractionResult?.usage) {
            finalUsage = extractionResult.usage;
          }
          console.log(`   - o4-mini extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
        } catch (fallbackErr) {
          console.error('   - o4-mini extraction also failed:', fallbackErr);
          throw new Error('All extraction methods failed');
        }
      }
    } else {
      // Default: o4-mini first
      console.log('   - Attempting extraction with OpenAI o4-mini...');
      try {
        extractionResult = await extractWithO4MiniHigh(documentText);
        if (extractionResult?.usage) {
          finalUsage = extractionResult.usage;
        }
        console.log(`   - o4-mini extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
      } catch (err) {
        console.warn('   - o4-mini extraction failed, falling back to Claude:', err);
        try {
          const claudeExtraction = await extractWithClaude4(documentText);
          claudeResult = claudeExtraction.data;
          if (claudeExtraction.usage) {
            finalUsage = claudeExtraction.usage;
          }
          console.log(`   - Claude extraction completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);
        } catch (claudeErr) {
          console.error('   - Claude extraction also failed:', claudeErr);
          throw new Error('All extraction methods failed');
        }
      }
    }
    
    if (extractionResult) {
      finalData = extractionResult.data;
      extraction_metadata.o4_mini_confidence = calculateConfidence(extractionResult.data); // Use actual confidence calculation
      console.log(`   - Using OpenAI ${extractionResult.model} extraction results`);
    } else if (claudeResult) {
      finalData = claudeResult;
      extraction_metadata.claude_confidence = calculateConfidence(claudeResult); // Use actual confidence calculation
      console.log('   - Using Claude extraction results (fallback model)');
      
      // finalUsage should already be set from the Claude extraction above
    } else {
      throw new Error('No extraction data available');
    }

    // Create consensus object for backward compatibility
    const consensus = {
      data: finalData,
      extraction_metadata: extraction_metadata
    };
    
    console.log(`   - Result processing completed in ${((Date.now() - processStart) / 1000).toFixed(2)}s`);

    // Step 5: Validate results
    console.log('✅ Validating extracted data...');
    const validateStart = Date.now();
    const validation = validateIEPData(consensus.data);
    console.log(`   - Validation completed in ${((Date.now() - validateStart) / 1000).toFixed(2)}s`);
    console.log(`   - Found ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
    
    console.log(`✨ Total processing completed in ${((Date.now() - processingStart) / 1000).toFixed(2)}s`);

    // Step 5: Return complete result
    return {
      success: true,
      data: consensus.data,
      metadata: {
        ...consensus.extraction_metadata,
        validation,
        processing_time: new Date().toISOString(),
        models_used: extractionResult ? [extractionResult.model] : ['claude-4-opus']
      },
      raw_results: {
        claude: claudeResult,
        o4_mini: extractionResult ? {
          data: extractionResult.data,
          usage: extractionResult.usage
        } : null
      },
      usage: finalUsage
    };
  } catch (error) {
    console.error('❌ Processing failed:', error);
    return {
      success: false,
      error: (error as Error).message,
      metadata: {
        processing_time: new Date().toISOString(),
        models_used: ['o4-mini', 'o4-mini-high', 'claude-4-opus']
      }
    };
  }
}

/**
 * Example usage and testing function
 */
async function main(): Promise<void> {
  try {
    // Example usage with uploaded IEP
    const result = await processIEPDocument('./samples/sample_iep.pdf', 'pdf');
    
    if (result.success && result.data) {
      console.log('✅ Extraction successful!');
      console.log('📊 Student Info:', result.data.studentInfo);
      console.log('🎯 Goals Count:', result.data.goals?.length || 0);
      console.log('⚙️ Accommodations Count:', result.data.accommodations?.length || 0);
      console.log('🔧 Services Count:', result.data.services?.length || 0);
      console.log('📋 Present Levels Areas:', Object.keys(result.data.presentLevels || {}));
      
      if (result.metadata.validation?.errors.length) {
        console.log('⚠️ Validation Errors:', result.metadata.validation.errors);
      }
      
      if (result.metadata.validation?.warnings.length) {
        console.log('⚠️ Validation Warnings:', result.metadata.validation.warnings);
      }
    } else {
      console.log('❌ Extraction failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Main execution failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
