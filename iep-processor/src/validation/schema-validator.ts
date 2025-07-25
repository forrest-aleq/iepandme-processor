import { SchemaCompliantIEPData } from '../extractors/schema-compliant-extractor';

interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  valid: boolean;
  score: number; // 0-100 completeness score
  issues: ValidationIssue[];
  fieldCompleteness: Record<string, boolean>;
  summary: {
    totalFields: number;
    completedFields: number;
    missingCriticalFields: string[];
    missingOptionalFields: string[];
  };
}

export function validateSchemaCompliance(data: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fieldCompleteness: Record<string, boolean> = {};
  
  // Critical fields that must be present
  const criticalFields = [
    'student.first_name',
    'student.last_name', 
    'student.student_id',
    'student.school',
    'goals',
    'services',
    'present_levels.academic_achievement'
  ];
  
  // Validate meta section
  validateMeta(data.meta, issues, fieldCompleteness);
  
  // Validate student section
  validateStudent(data.student, issues, fieldCompleteness);
  
  // Validate meeting section
  validateMeeting(data.meeting, issues, fieldCompleteness);
  
  // Validate eligibility section
  validateEligibility(data.eligibility, issues, fieldCompleteness);
  
  // Validate present levels
  validatePresentLevels(data.present_levels, issues, fieldCompleteness);
  
  // Validate goals
  validateGoals(data.goals, issues, fieldCompleteness);
  
  // Validate services
  validateServices(data.services, issues, fieldCompleteness);
  
  // Validate accommodations
  validateAccommodations(data.accommodations, issues, fieldCompleteness);
  
  // Validate other sections
  validateModifications(data.modifications, issues, fieldCompleteness);
  validateAssessmentParticipation(data.assessment_participation, issues, fieldCompleteness);
  validatePlacement(data.placement, issues, fieldCompleteness);
  validateProgressReports(data.progress_reports, issues, fieldCompleteness);
  validateSignatures(data.signatures, issues, fieldCompleteness);
  
  // Calculate completeness score
  const totalFields = Object.keys(fieldCompleteness).length;
  const completedFields = Object.values(fieldCompleteness).filter(Boolean).length;
  const score = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  
  // Check critical fields
  const missingCriticalFields = criticalFields.filter(field => {
    const value = getNestedValue(data, field);
    return !value || (Array.isArray(value) && value.length === 0);
  });
  
  const missingOptionalFields = Object.keys(fieldCompleteness)
    .filter(field => !fieldCompleteness[field] && !criticalFields.includes(field));
  
  const valid = issues.filter(i => i.severity === 'error').length === 0 && missingCriticalFields.length === 0;
  
  return {
    valid,
    score,
    issues,
    fieldCompleteness,
    summary: {
      totalFields,
      completedFields,
      missingCriticalFields,
      missingOptionalFields
    }
  };
}

function validateMeta(meta: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['meta.doc_id'] = !!meta?.doc_id;
  fieldCompleteness['meta.source'] = !!meta?.source;
  fieldCompleteness['meta.version'] = !!meta?.version;
  fieldCompleteness['meta.extracted_at'] = !!meta?.extracted_at;
  
  if (!meta?.doc_id) issues.push({ field: 'meta.doc_id', issue: 'Missing document ID', severity: 'warning' });
  if (!meta?.extracted_at) issues.push({ field: 'meta.extracted_at', issue: 'Missing extraction timestamp', severity: 'warning' });
}

function validateStudent(student: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['student.first_name'] = !!student?.first_name;
  fieldCompleteness['student.last_name'] = !!student?.last_name;
  fieldCompleteness['student.dob'] = !!student?.dob;
  fieldCompleteness['student.student_id'] = !!student?.student_id;
  fieldCompleteness['student.grade'] = !!student?.grade;
  fieldCompleteness['student.school'] = !!student?.school;
  fieldCompleteness['student.district'] = !!student?.district;
  
  if (!student?.first_name) issues.push({ field: 'student.first_name', issue: 'Missing first name', severity: 'error' });
  if (!student?.last_name) issues.push({ field: 'student.last_name', issue: 'Missing last name', severity: 'error' });
  if (!student?.student_id) issues.push({ field: 'student.student_id', issue: 'Missing student ID', severity: 'error' });
  if (!student?.school) issues.push({ field: 'student.school', issue: 'Missing school name', severity: 'error' });
  
  // Validate date format
  if (student?.dob && !isValidDate(student.dob)) {
    issues.push({ field: 'student.dob', issue: 'Invalid date format (should be YYYY-MM-DD)', severity: 'warning' });
  }
}

function validateMeeting(meeting: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['meeting.iep_start_date'] = !!meeting?.iep_start_date;
  fieldCompleteness['meeting.iep_end_date'] = !!meeting?.iep_end_date;
  fieldCompleteness['meeting.meeting_date'] = !!meeting?.meeting_date;
  fieldCompleteness['meeting.participants'] = Array.isArray(meeting?.participants) && meeting.participants.length > 0;
  
  if (!meeting?.iep_start_date) issues.push({ field: 'meeting.iep_start_date', issue: 'Missing IEP start date', severity: 'warning' });
  if (!meeting?.iep_end_date) issues.push({ field: 'meeting.iep_end_date', issue: 'Missing IEP end date', severity: 'warning' });
  
  // Validate participants
  if (Array.isArray(meeting?.participants)) {
    meeting.participants.forEach((participant: any, index: number) => {
      if (!participant.name) {
        issues.push({ field: `meeting.participants[${index}].name`, issue: 'Missing participant name', severity: 'warning' });
      }
      if (!participant.role) {
        issues.push({ field: `meeting.participants[${index}].role`, issue: 'Missing participant role', severity: 'warning' });
      }
    });
  }
}

function validateEligibility(eligibility: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['eligibility.primary_disability'] = !!eligibility?.primary_disability;
  fieldCompleteness['eligibility.secondary_disabilities'] = Array.isArray(eligibility?.secondary_disabilities);
  fieldCompleteness['eligibility.eligibility_date'] = !!eligibility?.eligibility_date;
  fieldCompleteness['eligibility.reeval_due_date'] = !!eligibility?.reeval_due_date;
  
  if (!eligibility?.primary_disability) {
    issues.push({ field: 'eligibility.primary_disability', issue: 'Missing primary disability', severity: 'warning' });
  }
}

function validatePresentLevels(presentLevels: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['present_levels.academic_achievement'] = !!presentLevels?.academic_achievement;
  fieldCompleteness['present_levels.functional_performance'] = !!presentLevels?.functional_performance;
  fieldCompleteness['present_levels.strengths'] = !!presentLevels?.strengths;
  fieldCompleteness['present_levels.needs'] = !!presentLevels?.needs;
  fieldCompleteness['present_levels.parent_input'] = !!presentLevels?.parent_input;
  
  if (!presentLevels?.academic_achievement) {
    issues.push({ field: 'present_levels.academic_achievement', issue: 'Missing academic achievement description', severity: 'error' });
  }
  
  // Check for minimum content length
  if (presentLevels?.academic_achievement && presentLevels.academic_achievement.length < 50) {
    issues.push({ field: 'present_levels.academic_achievement', issue: 'Academic achievement description seems too short', severity: 'warning' });
  }
}

function validateGoals(goals: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['goals'] = Array.isArray(goals) && goals.length > 0;
  
  if (!Array.isArray(goals) || goals.length === 0) {
    issues.push({ field: 'goals', issue: 'No goals found', severity: 'error' });
    return;
  }
  
  goals.forEach((goal: any, index: number) => {
    const prefix = `goals[${index}]`;
    
    fieldCompleteness[`${prefix}.area`] = !!goal.area;
    fieldCompleteness[`${prefix}.statement`] = !!goal.statement;
    fieldCompleteness[`${prefix}.baseline`] = !!goal.baseline;
    fieldCompleteness[`${prefix}.criteria`] = !!goal.criteria;
    fieldCompleteness[`${prefix}.measurement_method`] = !!goal.measurement_method;
    fieldCompleteness[`${prefix}.short_term_objectives`] = Array.isArray(goal.short_term_objectives);
    
    if (!goal.area) issues.push({ field: `${prefix}.area`, issue: 'Missing goal area', severity: 'error' });
    if (!goal.statement) issues.push({ field: `${prefix}.statement`, issue: 'Missing goal statement', severity: 'error' });
    if (!goal.baseline) issues.push({ field: `${prefix}.baseline`, issue: 'Missing baseline data', severity: 'error' });
    if (!goal.criteria) issues.push({ field: `${prefix}.criteria`, issue: 'Missing success criteria', severity: 'warning' });
    
    // Validate baseline quality
    if (goal.baseline && goal.baseline.length < 30) {
      issues.push({ field: `${prefix}.baseline`, issue: 'Baseline seems too short or incomplete', severity: 'warning' });
    }
    
    // Validate objectives
    if (Array.isArray(goal.short_term_objectives)) {
      goal.short_term_objectives.forEach((obj: any, objIndex: number) => {
        if (!obj.statement) {
          issues.push({ field: `${prefix}.short_term_objectives[${objIndex}].statement`, issue: 'Missing objective statement', severity: 'warning' });
        }
      });
    }
  });
}

function validateServices(services: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['services'] = Array.isArray(services) && services.length > 0;
  
  if (!Array.isArray(services) || services.length === 0) {
    issues.push({ field: 'services', issue: 'No services found', severity: 'warning' });
    return;
  }
  
  services.forEach((service: any, index: number) => {
    const prefix = `services[${index}]`;
    
    fieldCompleteness[`${prefix}.type`] = !!service.type;
    fieldCompleteness[`${prefix}.provider_role`] = !!service.provider_role;
    fieldCompleteness[`${prefix}.location`] = !!service.location;
    fieldCompleteness[`${prefix}.frequency`] = !!service.frequency?.amount && !!service.frequency?.unit;
    fieldCompleteness[`${prefix}.duration_minutes`] = typeof service.duration_minutes === 'number';
    
    if (!service.type) issues.push({ field: `${prefix}.type`, issue: 'Missing service type', severity: 'error' });
    if (!service.frequency?.amount || !service.frequency?.unit) {
      issues.push({ field: `${prefix}.frequency`, issue: 'Missing or invalid frequency structure', severity: 'error' });
    }
    if (typeof service.duration_minutes !== 'number') {
      issues.push({ field: `${prefix}.duration_minutes`, issue: 'Missing or invalid duration', severity: 'warning' });
    }
    
    // Validate frequency structure
    if (service.frequency) {
      if (typeof service.frequency.amount !== 'number' || service.frequency.amount <= 0) {
        issues.push({ field: `${prefix}.frequency.amount`, issue: 'Frequency amount must be a positive number', severity: 'error' });
      }
      if (!service.frequency.unit || !service.frequency.unit.includes('/')) {
        issues.push({ field: `${prefix}.frequency.unit`, issue: 'Frequency unit should be in format "sessions/week" or "minutes/week"', severity: 'warning' });
      }
    }
  });
}

function validateAccommodations(accommodations: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['accommodations'] = Array.isArray(accommodations) && accommodations.length > 0;
  
  if (Array.isArray(accommodations)) {
    accommodations.forEach((acc: any, index: number) => {
      const prefix = `accommodations[${index}]`;
      fieldCompleteness[`${prefix}.description`] = !!acc.description;
      fieldCompleteness[`${prefix}.context`] = !!acc.context;
      
      if (!acc.description) {
        issues.push({ field: `${prefix}.description`, issue: 'Missing accommodation description', severity: 'warning' });
      }
    });
  }
}

function validateModifications(modifications: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['modifications'] = Array.isArray(modifications);
}

function validateAssessmentParticipation(assessment: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['assessment_participation.state_assessments'] = Array.isArray(assessment?.state_assessments);
}

function validatePlacement(placement: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['placement.lre_percentage_general_ed'] = typeof placement?.lre_percentage_general_ed === 'number';
  fieldCompleteness['placement.lre_description'] = !!placement?.lre_description;
  fieldCompleteness['placement.transportation'] = typeof placement?.transportation === 'boolean';
}

function validateProgressReports(reports: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['progress_reports'] = Array.isArray(reports);
}

function validateSignatures(signatures: any, issues: ValidationIssue[], fieldCompleteness: Record<string, boolean>) {
  fieldCompleteness['signatures'] = Array.isArray(signatures) && signatures.length > 0;
}

function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export { ValidationIssue, ValidationResult };
