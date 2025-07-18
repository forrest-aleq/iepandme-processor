/**
 * Shared JSON Schema for IEP data extraction using OpenAI Structured Outputs
 * This ensures all extraction methods return consistent, validated data
 */

export const IEP_JSON_SCHEMA = {
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
} as const;