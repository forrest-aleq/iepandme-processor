/**
 * JSON Schema for IEP data extraction
 * Used to validate and guide AI model extraction
 */

export const IEP_SCHEMA = {
  "type": "object",
  "required": ["metadata", "studentInfo", "reviewDates", "caseManager", "presentLevels", "goals", "accommodations", "services"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["schemaVersion", "source", "documentDate", "parsedAt"],
      "properties": {
        "schemaVersion": { "type": "string" },
        "source": { "type": "string" },
        "documentDate": { "type": "string" },
        "parsedAt": { "type": "string" }
      }
    },
    "studentInfo": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" },
        "birthdate": { "type": ["string", "null"] },
        "school": { "type": ["string", "null"] },
        "grade": { "type": ["string", "null"] },
        "gender": { "type": ["string", "null"] },
        "studentId": { "type": ["string", "null"] },
        "district": { "type": ["string", "null"] },
        "homeAddress": { "type": ["string", "null"] },
        "primaryLanguage": { "type": ["string", "null"] },
        "ethnicity": { "type": ["string", "null"] },
        "parentGuardianInfo": {
          "type": ["array", "null"],
          "items": {
            "type": "object",
            "required": ["name", "relationship"],
            "properties": {
              "name": { "type": "string" },
              "relationship": { "type": "string" },
              "phone": { "type": ["string", "null"] },
              "email": { "type": ["string", "null"] },
              "address": { "type": ["string", "null"] }
            }
          }
        }
      }
    },
    "reviewDates": {
      "type": "object",
      "properties": {
        "annualReview": { "type": ["string", "null"] },
        "effectiveUntil": { "type": ["string", "null"] },
        "evaluationDueDate": { "type": ["string", "null"] },
        "reevaluationDueDate": { "type": ["string", "null"] },
        "lastEvaluationDate": { "type": ["string", "null"] }
      }
    },
    "caseManager": {
      "type": "object",
      "properties": {
        "name": { "type": ["string", "null"] },
        "email": { "type": ["string", "null"] },
        "phone": { "type": ["string", "null"] },
        "position": { "type": ["string", "null"] }
      }
    },
    "presentLevels": {
      "type": "object",
      "properties": {
        "academics": { "type": ["string", "null"] },
        "adaptiveDailyLivingSkills": { "type": ["string", "null"] },
        "communicationDevelopment": { "type": ["string", "null"] },
        "grossFineMotorDevelopment": { "type": ["string", "null"] },
        "health": { "type": ["string", "null"] },
        "socialEmotionalBehavioral": { "type": ["string", "null"] },
        "vocational": { "type": ["string", "null"] }
      }
    },
    "goals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["goalArea", "baseline", "description"],
        "properties": {
          "goalArea": { "type": "string" },
          "goalTopic": { "type": ["string", "null"] },
          "baseline": { "type": "string" },
          "description": { "type": "string" },
          "targetDate": { "type": ["string", "null"] },
          "targetPercentage": { "type": ["number", "null"] },
          "additionalGoalAreas": {
            "type": ["array", "null"],
            "items": { "type": "string" }
          },
          "shortTermObjectives": {
            "type": ["array", "null"],
            "items": {
              "type": "object",
              "required": ["description", "criteria", "evaluation"],
              "properties": {
                "description": { "type": "string" },
                "criteria": { "type": "string" },
                "evaluation": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "accommodations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "description"],
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "category": { "type": ["string", "null"] },
          "frequency": { "type": ["string", "null"] },
          "location": { "type": ["string", "null"] },
          "startDate": { "type": ["string", "null"] },
          "endDate": { "type": ["string", "null"] }
        }
      }
    },
    "services": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["serviceType", "durationMinutes", "frequency", "provider", "sessionType", "sessionLocation"],
        "properties": {
          "serviceType": { "type": "string" },
          "durationMinutes": { "type": "number" },
          "frequency": { "type": "string" },
          "provider": { "type": "string" },
          "sessionType": { "type": "string" },
          "sessionLocation": { "type": "string" },
          "startDate": { "type": ["string", "null"] },
          "endDate": { "type": ["string", "null"] },
          "comments": { "type": ["string", "null"] }
        }
      }
    },
    "standardizedAssessments": {
      "type": ["object", "null"],
      "properties": {
        "districtAssessments": {
          "type": ["array", "null"],
          "items": {
            "type": "object",
            "required": ["assessmentName"],
            "properties": {
              "assessmentName": { "type": "string" },
              "date": { "type": ["string", "null"] },
              "scores": { "type": ["string", "null"] },
              "comments": { "type": ["string", "null"] }
            }
          }
        },
        "stateAssessments": {
          "type": ["array", "null"],
          "items": {
            "type": "object",
            "required": ["assessmentName"],
            "properties": {
              "assessmentName": { "type": "string" },
              "date": { "type": ["string", "null"] },
              "scores": { "type": ["string", "null"] },
              "comments": { "type": ["string", "null"] }
            }
          }
        },
        "languageAssessments": {
          "type": ["array", "null"],
          "items": {
            "type": "object",
            "required": ["assessmentName"],
            "properties": {
              "assessmentName": { "type": "string" },
              "date": { "type": ["string", "null"] },
              "scores": { "type": ["string", "null"] },
              "comments": { "type": ["string", "null"] }
            }
          }
        },
        "physicalAssessments": {
          "type": ["array", "null"],
          "items": {
            "type": "object",
            "required": ["assessmentName"],
            "properties": {
              "assessmentName": { "type": "string" },
              "date": { "type": ["string", "null"] },
              "scores": { "type": ["string", "null"] },
              "comments": { "type": ["string", "null"] }
            }
          }
        }
      }
    }
  }
};
