import OpenAI from 'openai';
import { OpenAIFileService } from '../services/openaiFileService.js';
import { IEPData } from '../types.js';
import { logger, LogContext } from '../utils/logger.js';

export class OpenAIFileExtractor {
  private openai: OpenAI;
  private fileService: OpenAIFileService;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.fileService = new OpenAIFileService(apiKey);
  }
  
  async extractFromFile(filePath: string): Promise<{
    data: Partial<IEPData>;
    confidence: number;
    fileId: string;
    metadata: any;
  }> {
    let fileId: string | null = null;
    const context: LogContext = {
      operation: 'file_extraction',
      filePath,
      model: 'gpt-4o'
    };
    
    try {
      logger.info('Starting file-based extraction', context);
      
      // Upload file to OpenAI
      fileId = await this.fileService.uploadFile(filePath);
      context.fileId = fileId;
      
      logger.info('File uploaded, starting extraction', context);
      
      // Process with native PDF understanding
      const startTime = Date.now();
      // Configure the API call with proper file input format
      const response = await this.openai.chat.completions.create({
        model: "o4-mini-2025-04-16", // Use the specified model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  file_id: fileId
                }
              },
              {
                type: "text",
                text: this.getIEPExtractionPrompt()
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "iep_extraction",
            strict: true,
            schema: this.getIEPSchema()
          }
        }
      });
      
      const duration = Date.now() - startTime;
      const content = response.choices[0].message.content;
      const extractedData = content ? JSON.parse(content) : {};
      const confidence = this.calculateConfidence(extractedData);
      
      const metadata = {
        model: "gpt-4o",
        tokensUsed: response.usage?.total_tokens || 0,
        processingTime: duration,
        extractionMethod: 'file_based'
      };
      
      logger.info('File extraction completed successfully', {
        ...context,
        duration,
        tokensUsed: metadata.tokensUsed,
        confidence
      });
      
      return {
        data: extractedData,
        confidence,
        fileId,
        metadata
      };
      
    } catch (error) {
      const processedError = error instanceof Error ? error : new Error(String(error));
      const errorCode = typeof error === 'object' && error !== null && 'status' in error ? 
        String(error.status) : 'unknown';
      
      logger.error('File extraction failed', processedError, {
        ...context,
        errorCode
      });
      
      throw new Error(`File extraction failed: ${processedError.message}`);
    } finally {
      // Clean up uploaded file
      if (fileId) {
        await this.fileService.deleteFile(fileId);
      }
    }
  }
  
  private getIEPExtractionPrompt(): string {
    return `You are an expert at extracting information from IEP (Individualized Education Program) documents.

Analyze this IEP document and extract all relevant information. Pay special attention to:
- Document layout and structure (headers, sections, tables)
- Tables containing goals, accommodations, and services with their specific formats
- Visual elements like charts, diagrams, or form fields
- Headers, footers, and form fields that may contain metadata
- Relationships between different sections of the document

Key extraction areas:
1. Student demographic information (name, DOB, school, grade, etc.)
2. Review and evaluation dates
3. Case manager and contact information
4. Present levels of performance across all 7 required areas
5. Annual goals with baselines, descriptions, and target criteria
6. Accommodations and modifications with detailed descriptions
7. Special education services with frequencies and providers
8. Standardized assessment results if present

Return the extracted data as structured JSON following the provided schema. If information is not clearly present in the document, use null values rather than making assumptions.

Focus on accuracy and completeness - this data will be used for important educational planning decisions.`;
  }
  
  private getIEPSchema() {
    return {
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
            birthdate: { type: ["string", "null"] },
            school: { type: ["string", "null"] },
            grade: { type: ["string", "null"] },
            gender: { type: ["string", "null"] },
            studentId: { type: ["string", "null"] },
            district: { type: ["string", "null"] },
            homeAddress: { type: ["string", "null"] },
            primaryLanguage: { type: ["string", "null"] },
            ethnicity: { type: ["string", "null"] },
            parentGuardianInfo: {
              type: ["array", "null"],
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  relationship: { type: "string" },
                  phone: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  address: { type: ["string", "null"] }
                },
                required: ["name", "relationship"],
                additionalProperties: false
              }
            }
          },
          required: ["name"],
          additionalProperties: false
        },
        reviewDates: {
          type: "object",
          properties: {
            annualReview: { type: ["string", "null"] },
            effectiveUntil: { type: ["string", "null"] },
            evaluationDueDate: { type: ["string", "null"] },
            reevaluationDueDate: { type: ["string", "null"] },
            lastEvaluationDate: { type: ["string", "null"] }
          },
          required: ["annualReview", "effectiveUntil"],
          additionalProperties: false
        },
        caseManager: {
          type: "object",
          properties: {
            name: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            position: { type: ["string", "null"] }
          },
          required: ["name", "email"],
          additionalProperties: false
        },
        presentLevels: {
          type: "object",
          properties: {
            academics: { type: ["string", "null"] },
            adaptiveDailyLivingSkills: { type: ["string", "null"] },
            communicationDevelopment: { type: ["string", "null"] },
            grossFineMotorDevelopment: { type: ["string", "null"] },
            health: { type: ["string", "null"] },
            socialEmotionalBehavioral: { type: ["string", "null"] },
            vocational: { type: ["string", "null"] }
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
              goalTopic: { type: ["string", "null"] },
              baseline: { type: "string" },
              description: { type: "string" },
              targetDate: { type: ["string", "null"] },
              targetPercentage: { type: ["number", "null"] },
              additionalGoalAreas: {
                type: ["array", "null"],
                items: { type: "string" }
              },
              shortTermObjectives: {
                type: ["array", "null"],
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    criteria: { type: "string" },
                    evaluation: { type: "string" }
                  },
                  required: ["description", "criteria", "evaluation"],
                  additionalProperties: false
                }
              }
            },
            required: ["goalArea", "baseline", "description"],
            additionalProperties: false
          }
        },
        accommodations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              category: { type: ["string", "null"] },
              frequency: { type: ["string", "null"] },
              location: { type: ["string", "null"] },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] }
            },
            required: ["title", "description"],
            additionalProperties: false
          }
        },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              serviceType: { type: "string" },
              durationMinutes: { type: "number" },
              frequency: { type: "string" },
              provider: { type: "string" },
              sessionType: { type: "string" },
              sessionLocation: { type: "string" },
              startDate: { type: ["string", "null"] },
              endDate: { type: ["string", "null"] },
              comments: { type: ["string", "null"] }
            },
            required: ["serviceType", "durationMinutes", "frequency", "provider", "sessionType", "sessionLocation"],
            additionalProperties: false
          }
        },
        standardizedAssessments: {
          type: ["object", "null"],
          properties: {
            districtAssessments: {
              type: ["array", "null"],
              items: {
                type: "object",
                properties: {
                  assessmentName: { type: "string" },
                  date: { type: ["string", "null"] },
                  scores: { type: ["string", "null"] },
                  comments: { type: ["string", "null"] }
                },
                required: ["assessmentName"],
                additionalProperties: false
              }
            },
            stateAssessments: {
              type: ["array", "null"],
              items: {
                type: "object",
                properties: {
                  assessmentName: { type: "string" },
                  date: { type: ["string", "null"] },
                  scores: { type: ["string", "null"] },
                  comments: { type: ["string", "null"] }
                },
                required: ["assessmentName"],
                additionalProperties: false
              }
            },
            languageAssessments: {
              type: ["array", "null"],
              items: {
                type: "object",
                properties: {
                  assessmentName: { type: "string" },
                  date: { type: ["string", "null"] },
                  scores: { type: ["string", "null"] },
                  comments: { type: ["string", "null"] }
                },
                required: ["assessmentName"],
                additionalProperties: false
              }
            },
            physicalAssessments: {
              type: ["array", "null"],
              items: {
                type: "object",
                properties: {
                  assessmentName: { type: "string" },
                  date: { type: ["string", "null"] },
                  scores: { type: ["string", "null"] },
                  comments: { type: ["string", "null"] }
                },
                required: ["assessmentName"],
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        }
      },
      required: ["metadata", "studentInfo", "reviewDates", "caseManager", "presentLevels", "goals", "accommodations", "services"],
      additionalProperties: false
    };
  }
  
  private calculateConfidence(data: Partial<IEPData>): number {
    let score = 0;
    let maxScore = 0;
    
    // Required fields scoring
    const requiredFields = [
      { field: data.studentInfo?.name, weight: 20, name: 'student name' },
      { field: data.reviewDates?.annualReview, weight: 15, name: 'annual review date' },
      { field: data.goals && data.goals.length > 0, weight: 25, name: 'goals' },
      { field: data.accommodations && data.accommodations.length > 0, weight: 15, name: 'accommodations' },
      { field: data.services && data.services.length > 0, weight: 15, name: 'services' }
    ];
    
    requiredFields.forEach(({ field, weight }) => {
      maxScore += weight;
      if (field) score += weight;
    });
    
    // Present levels completeness (7 areas)
    const presentLevelsAreas = [
      data.presentLevels?.academics,
      data.presentLevels?.adaptiveDailyLivingSkills,
      data.presentLevels?.communicationDevelopment,
      data.presentLevels?.grossFineMotorDevelopment,
      data.presentLevels?.health,
      data.presentLevels?.socialEmotionalBehavioral,
      data.presentLevels?.vocational
    ];
    
    const presentLevelsWeight = 10;
    maxScore += presentLevelsWeight;
    const presentLevelsScore = presentLevelsAreas.filter(area => area && area.trim().length > 0).length / 7;
    score += presentLevelsScore * presentLevelsWeight;
    
    return Math.round((score / maxScore) * 100);
  }
}