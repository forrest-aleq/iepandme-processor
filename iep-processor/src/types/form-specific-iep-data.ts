/**
 * Form-Specific IEP Data Interface
 * 
 * This interface matches the exact structure and field names from the_schema.json
 * to ensure perfect compliance with the actual IEP forms used by the school district.
 * 
 * CRITICAL: All field names must match the exact form labels, including:
 * - Section titles: "CHILD'S INFORMATION", "6. MEASURABLE ANNUAL GOALS", etc.
 * - Field labels: "NAME", "ID NUMBER", "PRESENT LEVEL OF...", etc.
 * - Boolean checkboxes for all form options
 * - Arrays for repeating sections (goals, services, amendments)
 */

export interface FormSpecificIEPData {
  IEP: {
    "CHILD'S INFORMATION": {
      "NAME": string;
      "ID NUMBER": string;
      "DATE OF BIRTH": string;
      "STREET": string;
      "CITY": string;
      "STATE": string;
      "ZIP": string;
      "GENDER": string;
      "GRADE": string;
      "DISTRICT OF RESIDENCE": string;
      "COUNTY OF RESIDENCE": string;
      "DISTRICT OF SERVICE": string;
      "Is the child in preschool?": boolean;
      "Will the child be 14 years old before the end of this IEP?": boolean;
      "Is the child younger than 14 years of age but has transition and postsecondary goal information?": boolean;
      "Is the child a ward of the state?": boolean;
      "If yes, name of surrogate parent": string;
      "IEP by third birthday? (If transitioning from Part C)": boolean;
    };

    "PARENT/GUARDIAN INFORMATION": {
      "Parent/Guardian 1": {
        "NAME": string;
        "STREET": string;
        "CITY": string;
        "STATE": string;
        "ZIP": string;
        "HOME PHONE": string;
        "WORK PHONE": string;
        "CELL PHONE": string;
        "EMAIL": string;
      };
      "Parent/Guardian 2": {
        "NAME": string;
        "STREET": string;
        "CITY": string;
        "STATE": string;
        "ZIP": string;
        "HOME PHONE": string;
        "WORK PHONE": string;
        "CELL PHONE": string;
        "EMAIL": string;
      };
      "OTHER INFORMATION": string;
    };

    "MEETING INFORMATION": {
      "MEETING DATE": string;
      "MEETING TYPE": {
        "INITIAL IEP": boolean;
        "ANNUAL REVIEW": boolean;
        "REVIEW OTHER THAN ANNUAL REVIEW": boolean;
        "AMENDMENT": boolean;
        "OTHER": boolean;
      };
    };

    "IEP TIMELINES": {
      "ETR COMPLETION DATE": string;
      "NEXT ETR DUE DATE": string;
    };

    "IEP EFFECTIVE DATES": {
      "START": string;
      "END": string;
      "NEXT IEP REVIEW": string;
    };

    "AMENDMENTS": Array<{
      "IEP SECTION AMENDED": string;
      "CHANGES TO THE IEP": string;
      "DATE OF AMENDMENT": string;
      "PARTICIPANT & ROLE INITIALS": string;
    }>;

    "1. FUTURE PLANNING": string;

    "2. SPECIAL INSTRUCTIONAL FACTORS": {
      "Does the child have behavior which impedes his/her learning or the learning of others?": boolean;
      "Does the child have limited English proficiency?": boolean;
      "Is the child blind or visually impaired?": boolean;
      "Does the child have communication needs (required for deaf or hearing impaired)?": boolean;
      "Does the child need assistive technology devices and/or services?": boolean;
      "Does the child require specially designed physical education?": boolean;
    };

    "3. PROFILE": {
      "Most Recent Evaluation Information": string;
      "Most Recent District Testing": string;
      "Concerns from Parent": string;
      "Effects on Progress in General Education": string;
    };

    "4. EXTENDED SCHOOL YEAR SERVICES": {
      "Progress in General Education": string;
      "Has the team determined that ESY services are necessary?": boolean;
      "If yes, what goals determined the need?": string;
      "Will the team need to collect further data and reconvene to make a determination?": boolean;
      "Date to Reconvene": string;
    };

    "5. POSTSECONDARY TRANSITION": {
      "Postsecondary Training and Education": {
        "Measurable Postsecondary Goal": string;
        "Age Appropriate Transition Assessment": string;
        "Courses of Study": string;
        "Numbers of Annual Goal(s) Related to Transition Needs": string;
        "Transition Services/Activities": Array<{
          "Service/Activity": string;
          "Projected Start Date": string;
          "Responsible Agency/Person": string;
        }>;
        "Method for Measuring Progress": {
          "Curriculum-Based Assessment": boolean;
          "Portfolios": boolean;
          "Observation": boolean;
          "Anecdotal Record": boolean;
          "Checklist": boolean;
          "Work Sample": boolean;
          "Rubric": boolean;
          "Other (list)": string;
        };
      };
      "Competitive Integrated Employment": {
        "Measurable Postsecondary Goal": string;
        "Age Appropriate Transition Assessment": string;
        "Courses of Study": string;
        "Numbers of Annual Goal(s) Related to Transition Needs": string;
        "Transition Services/Activities": Array<{
          "Service/Activity": string;
          "Projected Start Date": string;
          "Responsible Agency/Person": string;
        }>;
        "Method for Measuring Progress": {
          "Curriculum-Based Assessment": boolean;
          "Portfolios": boolean;
          "Observation": boolean;
          "Anecdotal Record": boolean;
          "Checklist": boolean;
          "Work Sample": boolean;
          "Rubric": boolean;
          "Other (list)": string;
        };
      };
      "Independent Living (as appropriate)": {
        "Measurable Postsecondary Goal": string;
        "Age Appropriate Transition Assessment": string;
        "Courses of Study": string;
        "Numbers of Annual Goal(s) Related to Transition Needs": string;
        "Transition Services/Activities": Array<{
          "Service/Activity": string;
          "Projected Start Date": string;
          "Responsible Agency/Person": string;
        }>;
        "Method for Measuring Progress": {
          "Curriculum-Based Assessment": boolean;
          "Portfolios": boolean;
          "Observation": boolean;
          "Anecdotal Record": boolean;
          "Checklist": boolean;
          "Work Sample": boolean;
          "Rubric": boolean;
          "Other (list)": string;
        };
      };
    };

    "6. MEASURABLE ANNUAL GOALS": {
      "FREQUENCY OF WRITTEN PROGRESS REPORTING TOWARD GOAL MASTERY TO PARENTS": string;
      "GOALS": Array<{
        "NUMBER": number;
        "AREA": string;
        "PRESENT LEVEL OF ACADEMIC ACHIEVEMENT AND FUNCTIONAL PERFORMANCE": string;
        "MEASURABLE ANNUAL GOAL": string;
        "METHOD(S) FOR MEASURING THE CHILD'S PROGRESS TOWARDS ANNUAL GOAL": {
          "Curriculum-Based Assessment": boolean;
          "Portfolios": boolean;
          "Observation": boolean;
          "Anecdotal Records": boolean;
          "Short-Cycle Assessments": boolean;
          "Performance Assessments": boolean;
          "Checklists": boolean;
          "Running Records": boolean;
          "Work Samples": boolean;
          "Inventories": boolean;
          "Rubrics": boolean;
        };
        "Objectives/Benchmarks": Array<{
          "Objective/Benchmark": string;
          "Date of Mastery": string;
        }>;
      }>;
    };

    "7. SPECIALLY DESIGNED SERVICES": {
      "SPECIALLY DESIGNED INSTRUCTION": Array<{
        "Description": string;
        "Goal Addressed #": number;
        "Provider Title": string;
        "Location of Service": string;
        "Begin Date": string;
        "End Date": string;
        "Amount of Time": string;
        "Frequency": string;
      }>;
      "RELATED SERVICES": Array<{
        "Description": string;
        "Goal Addressed #": number;
        "Provider Title": string;
        "Location of Service": string;
        "Begin Date": string;
        "End Date": string;
        "Amount of Time": string;
        "Frequency": string;
      }>;
      "ACCOMMODATIONS": Array<{
        "Description": string;
        "Begin Date": string;
        "End Date": string;
      }>;
      "MODIFICATIONS": Array<{
        "Description": string;
        "Begin Date": string;
        "End Date": string;
      }>;
      "SUPPORT FOR SCHOOL PERSONNEL": Array<{
        "Description": string;
        "Begin Date": string;
        "End Date": string;
      }>;
      "SERVICE(S) TO SUPPORT MEDICAL NEEDS": Array<{
        "Description": string;
        "Begin Date": string;
        "End Date": string;
      }>;
    };

    "8. TRANSPORTATION AS A RELATED SERVICE": {
      "Does the child require special transportation?": boolean;
      "Does the child need transportation to and from services?": boolean;
      "Special Transportation Needs": {
        "Wheelchair Accessible": boolean;
        "Car Seat": boolean;
        "Harness/Seat Belt": boolean;
        "Monitor/Aide": boolean;
        "Air Conditioning": boolean;
        "Shortened Route/Day": boolean;
        "Other (specify)": string;
      };
    };

    "9. NONACADEMIC AND EXTRACURRICULAR ACTIVITIES": {
      "Participation with nondisabled peers (describe)": string;
      "If the child will not participate, explain": string;
    };

    "10. GENERAL FACTORS": {
      "The strengths of the child considered?": boolean;
      "The concerns of the parents for the education of the child considered?": boolean;
      "The results of the initial or most recent evaluation considered?": boolean;
      "The academic, developmental, and functional needs of the child considered?": boolean;
      "Communication needs": {
        "Does the child have communication needs?": boolean;
        "If yes, describe": string;
      };
      "Behavior needs": {
        "Does the child have behavior that impedes learning?": boolean;
        "If yes, describe strategies": string;
      };
      "Limited English proficiency": {
        "Does the child have limited English proficiency?": boolean;
        "If yes, describe language needs": string;
      };
      "Blind or visually impaired": {
        "Is the child blind or visually impaired?": boolean;
        "If yes, describe needs": string;
      };
      "Assistive technology": {
        "Does the child need assistive technology?": boolean;
        "If yes, describe devices/services": string;
      };
    };

    "11. LEAST RESTRICTIVE ENVIRONMENT": {
      "Percentage of time in general education": number;
      "Justification for removal from general education": string;
      "Supplementary aids and services": string;
    };

    "12. STATEWIDE AND DISTRICT WIDE TESTING": {
      "District Testing": Array<{
        "AREA": string;
        "ASSESSMENT TITLE": string;
        "DETAIL OF ACCOMMODATIONS": string;
      }>;
      "Statewide Testing": Array<{
        "AREA": string;
        "ASSESSMENT TITLE": string;
        "DETAIL OF ACCOMMODATIONS": string;
      }>;
    };

    "13. EXEMPTIONS": {
      "Is the child participating in the Alternate Assessment (AASCD)?": boolean;
      "If yes, justify choice of alternate assessment": string;
      "Will the child participate in district-wide and state-wide assessments with accommodations?": boolean;
      "If yes, accommodations for each subject": Array<{
        "Subject": string;
        "Accommodation": string;
      }>;
      "Does the child have a significant cognitive disability?": boolean;
      "If no (not significant cognitive disability), retention provision of Third Grade Reading Guarantee": {
        "Not exempt from retention": boolean;
        "Exempt from retention": boolean;
      };
      "Is the child excused from consequences of not passing required graduation tests?": boolean;
      "Subjects of excused graduation tests (if any)": Array<{
        "Course Title": string;
        "Justification": string;
      }>;
    };

    "14. MEETING PARTICIPANTS": {
      "IEP Meeting Participants (attended and participated)": Array<{
        "Name": string;
        "Position": string;
        "Signature": string;
        "Date": string;
      }>;
      "People not in attendance who provided information": Array<{
        "Name": string;
        "Position": string;
        "Signature": string;
        "Date": string;
      }>;
      "This IEP meeting was": {
        "Face-to-Face Meeting": boolean;
        "Video Conference": boolean;
        "Telephone Conference/Conference Call": boolean;
        "Other": boolean;
      };
      "IEP EFFECTIVE DATES": {
        "START": string;
        "END": string;
        "DATE OF NEXT IEP REVIEW": string;
      };
    };

    "15. SIGNATURES": {
      "INITIAL IEP": {
        "I give consent to initiate special education and related services in this IEP": boolean;
        "I give consent to initiate services except for": string;
        "I do not give consent for services at this time": boolean;
        "Parent/Guardian Signature (Initial IEP)": string;
        "Date": string;
      };
      "IEP ANNUAL REVIEW (Not a Change of Placement)": {
        "Parent agrees with implementation of this IEP": boolean;
        "Parent attendance noted but does NOT agree with the following IEP services": string;
        "Parent/Guardian Signature (Annual Review)": string;
        "Date": string;
      };
      "IEP REVIEW (Change of Placement)": {
        "I give consent for the Change of Placement as identified in this IEP": boolean;
        "I do NOT give consent for the Change of Placement as identified in this IEP": boolean;
        "I revoke consent for all special education and related services": boolean;
        "Parent/Guardian Signature (Change of Placement)": string;
        "Date": string;
      };
      "Procedural Safeguards Notice received at IEP meeting": boolean;
      "If no, date provided": string;
      "Transfer of Rights discussed by 17th birthday (Yes/No)": boolean;
      "Student Signature (age of majority notice)": string;
      "Date (Student)": string;
      "Parent/Guardian Signature (acknowledging transfer of rights)": string;
      "Date (Parent transfer notice)": string;
      "Parent received a copy of the IEP at the meeting": boolean;
      "If no, date copy sent": string;
    };
  };
}

/**
 * API Usage tracking interface
 */
export interface ApiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
  cost_usd: number;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  missingFields: string[];
  incorrectTypes: string[];
}
