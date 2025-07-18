/**
 * Types used throughout the IEP processor
 */

/**
 * Interface defining the structure of an IEP (Individualized Education Program) document
 */
export interface IEPData {
  metadata: {
    schemaVersion: string;
    source: string; 
    documentDate: string;
    parsedAt: string;
  };
  studentInfo: {
    name: string;
    birthdate: string | null;
    school: string | null;
    grade: string | null;
    gender: string | null;
    studentId: string | null;
    district: string | null;
    homeAddress?: string | null;
    primaryLanguage?: string | null;
    ethnicity?: string | null;
    parentGuardianInfo?: Array<{
      name: string;
      relationship: string;
      phone?: string;
      email?: string;
      address?: string;
    }> | null;
  };
  reviewDates: {
    annualReview: string | null;
    effectiveUntil: string | null;
    evaluationDueDate?: string | null;
    reevaluationDueDate?: string | null;
    lastEvaluationDate?: string | null;
  };
  caseManager: {
    name: string | null;
    email: string | null;
    phone?: string | null;
    position?: string | null;
  };
  presentLevels: {
    academics: string | null;
    adaptiveDailyLivingSkills: string | null;
    communicationDevelopment: string | null;
    grossFineMotorDevelopment: string | null;
    health: string | null;
    socialEmotionalBehavioral: string | null;
    vocational: string | null;
  };
  goals: Array<{
    goalArea: string;
    goalTopic?: string | null;
    baseline: string;
    description: string;
    targetDate?: string | null;
    targetPercentage?: number | null;
    additionalGoalAreas?: string[] | null;
    shortTermObjectives?: Array<{
      description: string;
      criteria: string;
      evaluation: string;
    }> | null;
  }>;
  accommodations: Array<{
    title: string;
    description: string;
    category?: string | null;
    frequency?: string | null;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  services: Array<{
    serviceType: string;
    durationMinutes: number;
    frequency: string;
    provider: string;
    sessionType: string;
    sessionLocation: string;
    startDate?: string | null;
    endDate?: string | null;
    comments?: string | null;
  }>;
  standardizedAssessments?: {
    districtAssessments?: Array<{
      assessmentName: string;
      date?: string;
      scores?: string;
      comments?: string;
    }> | null;
    stateAssessments?: Array<{
      assessmentName: string;
      date?: string;
      scores?: string;
      comments?: string;
    }> | null;
    languageAssessments?: Array<{
      assessmentName: string;
      date?: string;
      scores?: string;
      comments?: string;
    }> | null;
    physicalAssessments?: Array<{
      assessmentName: string;
      date?: string;
      scores?: string;
      comments?: string;
    }> | null;
  } | null;
}
