import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Schema-compliant interfaces based on the_schema.json
interface SchemaCompliantIEPData {
  meta: {
    doc_id: string;
    source: string;
    version: string;
    extracted_at: string;
  };
  student: {
    first_name: string;
    last_name: string;
    dob: string;
    student_id: string;
    grade: string;
    school: string;
    district: string;
  };
  meeting: {
    iep_start_date: string;
    iep_end_date: string;
    meeting_date: string;
    participants: Array<{
      name: string;
      role: string;
    }>;
  };
  eligibility: {
    primary_disability: string;
    secondary_disabilities: string[];
    eligibility_date: string;
    reeval_due_date: string;
  };
  present_levels: {
    academic_achievement: string;
    functional_performance: string;
    strengths: string;
    needs: string;
    parent_input: string;
  };
  goals: Array<{
    id: string;
    area: string;
    statement: string;
    baseline: string;
    criteria: string;
    measurement_method: string;
    progress_reporting_frequency: string;
    short_term_objectives: Array<{
      id: string;
      statement: string;
      criteria: string;
      due_date: string;
    }>;
  }>;
  services: Array<{
    id: string;
    type: string;
    provider_role: string;
    location: string;
    frequency: {
      amount: number;
      unit: string;
    };
    duration_minutes: number;
    group_size: string;
    start_date: string;
    end_date: string;
  }>;
  accommodations: Array<{
    id: string;
    description: string;
    context: string;
    start_date: string;
    end_date: string;
  }>;
  modifications: Array<{
    id: string;
    description: string;
    context: string;
  }>;
  assessment_participation: {
    state_assessments: Array<{
      name: string;
      participation: string;
      accommodations: string[];
    }>;
  };
  placement: {
    lre_percentage_general_ed: number;
    lre_description: string;
    transportation: boolean;
  };
  progress_reports: Array<{
    goal_id: string;
    date: string;
    status: string;
    evidence: string;
  }>;
  signatures: Array<{
    name: string;
    role: string;
    signed_at: string;
  }>;
}

interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
  cost_usd: number;
}

export async function extractWithSchemaCompliance(
  filePath: string,
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium'
): Promise<{data: SchemaCompliantIEPData; usage?: ApiUsage; model: string}> {
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const client = getOpenAIClient();
  const fileName = path.basename(filePath);
  
  console.log(`📄 Processing: ${fileName}`);
  console.log(`   - Uploading file to OpenAI...`);
  
  // Upload file
  const file = await client.files.create({
    file: fs.createReadStream(filePath),
    purpose: "user_data",
  });
  
  console.log(`   - File uploaded with ID: ${file.id}`);
  
  try {
    // Create the schema-based extraction prompt
    const prompt = `You are an expert IEP document analyst. Extract data following this EXACT schema structure.

🎯 CRITICAL EXTRACTION REQUIREMENTS:

**STUDENT INFORMATION:**
- Extract first_name and last_name as separate fields
- Find student_id (may be labeled as ID, Student #, etc.)
- Extract grade level and school name exactly as written
- Look for date of birth (dob) in any format, convert to YYYY-MM-DD

**GOALS SECTION:**
For each goal, extract:
- id: Generate as "G1", "G2", etc.
- area: Subject/domain (Reading, Math, Behavior, Communication, etc.)
- statement: Complete goal statement exactly as written
- baseline: Current performance level with specific data/scores
- criteria: Success criteria (e.g., "80% accuracy across 3 trials")
- measurement_method: How progress is measured (probes, observations, etc.)
- progress_reporting_frequency: How often progress is reported
- short_term_objectives: Array of sub-goals with id, statement, criteria, due_date

**SERVICES SECTION:**
For each service, extract:
- id: Generate as "S1", "S2", etc.
- type: Service name (Speech Therapy, Occupational Therapy, etc.)
- provider_role: Who provides it (SLP, OT, Special Ed Teacher, etc.)
- location: Where service is provided (classroom, therapy room, etc.)
- frequency: {amount: NUMBER, unit: "sessions/week" or "minutes/week"}
- duration_minutes: Length of each session as number
- group_size: "individual", "small group", "large group"
- start_date and end_date: Service dates

**ACCOMMODATIONS:**
For each accommodation:
- id: Generate as "A1", "A2", etc.
- description: What the accommodation is
- context: Where it applies (classroom instruction, testing, etc.)

**PRESENT LEVELS:**
Extract these specific sections:
- academic_achievement: Academic performance description
- functional_performance: Daily living/functional skills description
- strengths: Student strengths and abilities
- needs: Areas needing support or improvement
- parent_input: Parent concerns or input

**MEETING INFORMATION:**
- iep_start_date: When IEP becomes effective
- iep_end_date: When IEP expires
- meeting_date: When IEP meeting was held
- participants: Array of {name, role} for meeting attendees

**ELIGIBILITY:**
- primary_disability: Main disability category
- secondary_disabilities: Array of additional disabilities
- eligibility_date: When student was found eligible
- reeval_due_date: When reevaluation is due

**CRITICAL FORMATTING RULES:**
1. All dates in YYYY-MM-DD format
2. Service frequency as {amount: number, unit: string}
3. Generate IDs for goals (G1, G2), services (S1, S2), accommodations (A1, A2)
4. Extract complete text, don't summarize
5. If field is empty/missing, use empty string "" or empty array []

Return JSON matching the exact schema structure provided.`;

    // Use Responses API with reasoning
    console.log(`   - Processing with reasoning effort: ${reasoningEffort}...`);
    
    const response = await client.responses.create({
      model: 'o4-mini',
      reasoning: { effort: reasoningEffort, summary: 'auto' },
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: file.id },
            { type: 'input_text', text: prompt }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'iep_schema_compliant_extraction',
          strict: true,
          schema: {
            type: "object",
            properties: {
              meta: {
                type: "object",
                properties: {
                  doc_id: { type: "string" },
                  source: { type: "string" },
                  version: { type: "string" },
                  extracted_at: { type: "string" }
                },
                required: ["doc_id", "source", "version", "extracted_at"],
                additionalProperties: false
              },
              student: {
                type: "object",
                properties: {
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                  dob: { type: "string" },
                  student_id: { type: "string" },
                  grade: { type: "string" },
                  school: { type: "string" },
                  district: { type: "string" }
                },
                required: ["first_name", "last_name", "dob", "student_id", "grade", "school", "district"],
                additionalProperties: false
              },
              meeting: {
                type: "object",
                properties: {
                  iep_start_date: { type: "string" },
                  iep_end_date: { type: "string" },
                  meeting_date: { type: "string" },
                  participants: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        role: { type: "string" }
                      },
                      required: ["name", "role"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["iep_start_date", "iep_end_date", "meeting_date", "participants"],
                additionalProperties: false
              },
              eligibility: {
                type: "object",
                properties: {
                  primary_disability: { type: "string" },
                  secondary_disabilities: { type: "array", items: { type: "string" } },
                  eligibility_date: { type: "string" },
                  reeval_due_date: { type: "string" }
                },
                required: ["primary_disability", "secondary_disabilities", "eligibility_date", "reeval_due_date"],
                additionalProperties: false
              },
              present_levels: {
                type: "object",
                properties: {
                  academic_achievement: { type: "string" },
                  functional_performance: { type: "string" },
                  strengths: { type: "string" },
                  needs: { type: "string" },
                  parent_input: { type: "string" }
                },
                required: ["academic_achievement", "functional_performance", "strengths", "needs", "parent_input"],
                additionalProperties: false
              },
              goals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    area: { type: "string" },
                    statement: { type: "string" },
                    baseline: { type: "string" },
                    criteria: { type: "string" },
                    measurement_method: { type: "string" },
                    progress_reporting_frequency: { type: "string" },
                    short_term_objectives: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          statement: { type: "string" },
                          criteria: { type: "string" },
                          due_date: { type: "string" }
                        },
                        required: ["id", "statement", "criteria", "due_date"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["id", "area", "statement", "baseline", "criteria", "measurement_method", "progress_reporting_frequency", "short_term_objectives"],
                  additionalProperties: false
                }
              },
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    provider_role: { type: "string" },
                    location: { type: "string" },
                    frequency: {
                      type: "object",
                      properties: {
                        amount: { type: "number" },
                        unit: { type: "string" }
                      },
                      required: ["amount", "unit"],
                      additionalProperties: false
                    },
                    duration_minutes: { type: "number" },
                    group_size: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" }
                  },
                  required: ["id", "type", "provider_role", "location", "frequency", "duration_minutes", "group_size", "start_date", "end_date"],
                  additionalProperties: false
                }
              },
              accommodations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    description: { type: "string" },
                    context: { type: "string" },
                    start_date: { type: "string" },
                    end_date: { type: "string" }
                  },
                  required: ["id", "description", "context", "start_date", "end_date"],
                  additionalProperties: false
                }
              },
              modifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    description: { type: "string" },
                    context: { type: "string" }
                  },
                  required: ["id", "description", "context"],
                  additionalProperties: false
                }
              },
              assessment_participation: {
                type: "object",
                properties: {
                  state_assessments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        participation: { type: "string" },
                        accommodations: { type: "array", items: { type: "string" } }
                      },
                      required: ["name", "participation", "accommodations"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["state_assessments"],
                additionalProperties: false
              },
              placement: {
                type: "object",
                properties: {
                  lre_percentage_general_ed: { type: "number" },
                  lre_description: { type: "string" },
                  transportation: { type: "boolean" }
                },
                required: ["lre_percentage_general_ed", "lre_description", "transportation"],
                additionalProperties: false
              },
              progress_reports: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goal_id: { type: "string" },
                    date: { type: "string" },
                    status: { type: "string" },
                    evidence: { type: "string" }
                  },
                  required: ["goal_id", "date", "status", "evidence"],
                  additionalProperties: false
                }
              },
              signatures: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    role: { type: "string" },
                    signed_at: { type: "string" }
                  },
                  required: ["name", "role", "signed_at"],
                  additionalProperties: false
                }
              }
            },
            required: ["meta", "student", "meeting", "eligibility", "present_levels", "goals", "services", "accommodations", "modifications", "assessment_participation", "placement", "progress_reports", "signatures"],
            additionalProperties: false
          }
        }
      },
      max_output_tokens: 8000
    });

    // Clean up uploaded file
    await client.files.delete(file.id);

    // Parse and validate response
    console.log('   - Parsing response...');
    
    // The response.output_text contains the actual extracted data as a JSON string
    let extractedData: SchemaCompliantIEPData;
    try {
      if (typeof response.output_text === 'string') {
        extractedData = JSON.parse(response.output_text);
      } else {
        throw new Error('Expected response.output_text to be a string');
      }
    } catch (parseError) {
      console.error('   - Failed to parse response:', parseError);
      console.error('   - Response output_text:', response.output_text);
      throw new Error(`Failed to parse extraction response: ${parseError}`);
    }
    
    // Calculate cost and usage
    const responseUsage = response.usage as any; // Type assertion for reasoning_tokens
    const usage: ApiUsage = {
      prompt_tokens: responseUsage?.input_tokens || 0,
      completion_tokens: responseUsage?.output_tokens || 0,
      reasoning_tokens: responseUsage?.reasoning_tokens || 0,
      total_tokens: (responseUsage?.input_tokens || 0) + (responseUsage?.output_tokens || 0) + (responseUsage?.reasoning_tokens || 0),
      cost_usd: calculateO4MiniCost(
        responseUsage?.input_tokens || 0,
        responseUsage?.output_tokens || 0,
        responseUsage?.reasoning_tokens || 0
      )
    };

    console.log(`   - Extraction completed successfully!`);
    console.log(`   - Tokens: ${usage.total_tokens} (${usage.reasoning_tokens} reasoning)`);
    console.log(`   - Cost: $${usage.cost_usd.toFixed(6)}`);

    return {
      data: extractedData,
      usage,
      model: 'o4-mini-2025-04-16-schema-compliant'
    };

  } finally {
    // Ensure file cleanup even if extraction fails
    try {
      await client.files.delete(file.id);
    } catch (cleanupError) {
      console.warn(`Warning: Could not delete file ${file.id}`);
    }
  }
}

function calculateO4MiniCost(
  promptTokens: number,
  completionTokens: number,
  reasoningTokens: number = 0
): number {
  // o4-mini pricing: $1.10 per million input tokens, $4.40 per million output tokens
  const inputCost = (promptTokens / 1_000_000) * 1.10;
  const outputCost = (completionTokens / 1_000_000) * 4.40;
  const reasoningCost = (reasoningTokens / 1_000_000) * 1.10; // Reasoning tokens priced as input
  
  return Number((inputCost + outputCost + reasoningCost).toFixed(6));
}

export { SchemaCompliantIEPData, ApiUsage };
