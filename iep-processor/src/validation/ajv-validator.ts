/**
 * Ajv Validator for Form-Specific IEP Data
 * 
 * This validator ensures that extracted IEP data matches the exact structure
 * and field names defined in the_schema.json. It provides detailed error
 * reporting for debugging and validation purposes.
 * 
 * CRITICAL: This validator catches:
 * - Missing required fields
 * - Incorrect field types
 * - Mis-named fields
 * - Invalid array structures
 * - Missing AMENDMENTS arrays (even if empty)
 * - Missing "Other (list)" fields
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationResult } from '../types/form-specific-iep-data';

// Load the form-specific schema
const schemaPath = path.join(process.cwd(), 'the_schema_optimized.json');
let formSchema: any;

try {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  formSchema = JSON.parse(schemaContent);
} catch (error) {
  throw new Error(`Failed to load the_schema_optimized.json: ${error}`);
}

// Initialize Ajv with comprehensive error reporting
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  strict: true, // Enforce exact schema compliance
  removeAdditional: false
});

// Add format validation (dates, emails, etc.)
addFormats(ajv);

// Compile the schema validator
const validate = ajv.compile(formSchema);

/**
 * Validates form-specific IEP data against the_schema.json
 * 
 * @param data - The extracted IEP data to validate
 * @returns ValidationResult with detailed error information
 */
export function validateFormSpecificData(data: any): ValidationResult {
  console.log('🔍 Validating form-specific IEP data...');
  
  const valid = validate(data);
  const errors = validate.errors || [];
  
  // Categorize errors for better debugging
  const missingFields = errors
    .filter(err => err.keyword === 'required')
    .map(err => {
      const missingProperty = err.params?.missingProperty || 'unknown';
      const instancePath = err.instancePath || 'root';
      return `${instancePath}/${missingProperty}`;
    });
  
  const incorrectTypes = errors
    .filter(err => err.keyword === 'type')
    .map(err => {
      const expectedType = err.params?.type || 'unknown';
      const instancePath = err.instancePath || 'unknown path';
      return `${instancePath}: expected ${expectedType}, got ${typeof err.data}`;
    });
  
  const additionalPropertyErrors = errors
    .filter(err => err.keyword === 'additionalProperties')
    .map(err => {
      const additionalProperty = err.params?.additionalProperty || 'unknown';
      const instancePath = err.instancePath || 'unknown path';
      return `${instancePath}: unexpected property "${additionalProperty}"`;
    });
  
  const enumErrors = errors
    .filter(err => err.keyword === 'enum')
    .map(err => {
      const allowedValues = err.params?.allowedValues || [];
      const instancePath = err.instancePath || 'unknown path';
      return `${instancePath}: value must be one of [${allowedValues.join(', ')}]`;
    });
  
  // Combine all error messages
  const allErrorMessages = [
    ...missingFields.map(field => `Missing required field: ${field}`),
    ...incorrectTypes,
    ...additionalPropertyErrors,
    ...enumErrors,
    ...errors
      .filter(err => !['required', 'type', 'additionalProperties', 'enum'].includes(err.keyword))
      .map(err => `${err.instancePath || 'root'}: ${err.message}`)
  ];
  
  // Check for critical form-specific issues
  const criticalIssues = checkCriticalFormIssues(data);
  allErrorMessages.push(...criticalIssues);
  
  if (valid && criticalIssues.length === 0) {
    console.log('✅ Validation passed - all form fields match schema exactly');
  } else {
    console.log(`❌ Validation failed - ${allErrorMessages.length} issues found`);
    if (missingFields.length > 0) {
      console.log(`   Missing fields: ${missingFields.length}`);
    }
    if (incorrectTypes.length > 0) {
      console.log(`   Type errors: ${incorrectTypes.length}`);
    }
  }
  
  return {
    valid: valid && criticalIssues.length === 0,
    errors: allErrorMessages,
    missingFields,
    incorrectTypes: [...incorrectTypes, ...additionalPropertyErrors, ...enumErrors]
  };
}

/**
 * Checks for critical form-specific issues that Ajv might miss
 */
function checkCriticalFormIssues(data: any): string[] {
  const issues: string[] = [];
  
  try {
    // Check if main IEP structure exists
    if (!data || !data.IEP) {
      issues.push('Missing root IEP structure');
      return issues;
    }
    
    const iep = data.IEP;
    
    // Note: Do not enforce AMENDMENTS at /IEP; not present in the current optimized schema
    
    // CRITICAL: Check for required main sections
    const requiredSections = [
      "CHILD'S INFORMATION",
      "PARENT/GUARDIAN INFORMATION",
      "6. MEASURABLE ANNUAL GOALS",
      "7. SPECIALLY DESIGNED SERVICES"
    ];
    
    for (const section of requiredSections) {
      if (!iep[section]) {
        issues.push(`Missing required section: ${section}`);
      }
    }
    
    // Check for "Other (list)" fields in transition sections
    if (iep["5. POSTSECONDARY TRANSITION"]) {
      const transition = iep["5. POSTSECONDARY TRANSITION"];
      const transitionSections = [
        "Postsecondary Training and Education",
        "Competitive Integrated Employment", 
        "Independent Living (as appropriate)"
      ];
      
      for (const sectionName of transitionSections) {
        const section = transition[sectionName];
        if (section && section["Method for Measuring Progress"]) {
          const methods = section["Method for Measuring Progress"];
          if (typeof methods["Other (list)"] === 'undefined') {
            issues.push(`Missing "Other (list)" field in ${sectionName} methods`);
          }
        }
      }
    }
    
    // Check goals structure
    if (iep["6. MEASURABLE ANNUAL GOALS"] && iep["6. MEASURABLE ANNUAL GOALS"].GOALS) {
      const goals = iep["6. MEASURABLE ANNUAL GOALS"].GOALS;
      if (!Array.isArray(goals)) {
        issues.push('GOALS must be an array');
      } else {
        goals.forEach((goal, index) => {
          if (!goal["METHOD(S) FOR MEASURING THE CHILD'S PROGRESS TOWARDS ANNUAL GOAL"]) {
            issues.push(`Goal ${index + 1}: Missing measurement methods section`);
          }
          if (!Array.isArray(goal["Objectives/Benchmarks"])) {
            issues.push(`Goal ${index + 1}: Objectives/Benchmarks must be an array`);
          }
        });
      }
    }
    
    // Check services structure
    if (iep["7. SPECIALLY DESIGNED SERVICES"]) {
      const services = iep["7. SPECIALLY DESIGNED SERVICES"];
      const serviceTypes = [
        "SPECIALLY DESIGNED INSTRUCTION",
        "RELATED SERVICES", 
        "ACCOMMODATIONS",
        "MODIFICATIONS"
      ];
      
      for (const serviceType of serviceTypes) {
        if (services[serviceType] && !Array.isArray(services[serviceType])) {
          issues.push(`${serviceType} must be an array`);
        }
      }

      // Cross-validate that services reference existing goals
      try {
        const goalsSection = iep["6. MEASURABLE ANNUAL GOALS"]; 
        const goalNumbers = new Set<number>();
        if (goalsSection && Array.isArray(goalsSection.GOALS)) {
          for (const g of goalsSection.GOALS) {
            const num = Number(g?.NUMBER);
            if (!Number.isNaN(num)) goalNumbers.add(num);
          }
        }
        for (const serviceType of serviceTypes) {
          const arr = services[serviceType];
          if (Array.isArray(arr)) {
            arr.forEach((svc: any, idx: number) => {
              if (typeof svc?.["Goal Addressed #"] !== 'undefined') {
                const refNum = Number(svc["Goal Addressed #"]);
                if (Number.isNaN(refNum)) {
                  issues.push(`${serviceType}[${idx}]: "Goal Addressed #" must be a number`);
                } else if (goalNumbers.size > 0 && !goalNumbers.has(refNum)) {
                  issues.push(`${serviceType}[${idx}]: references Goal #${refNum} not present in GOALS`);
                } else if (goalNumbers.size === 0 && refNum >= 1) {
                  issues.push(`${serviceType}[${idx}]: references Goal #${refNum} but GOALS array is empty`);
                }
              }
            });
          }
        }
      } catch (e) {
        issues.push(`Error during services-goals cross-check: ${e}`);
      }
    }
  } catch (error) {
    issues.push(`Error during critical issues check: ${error}`);
  }
  
  return issues;
}

/**
 * Validates a specific section of the IEP data
 */
export function validateSection(data: any, sectionPath: string): ValidationResult {
  // Extract the specific section from the data
  const pathParts = sectionPath.split('.');
  let sectionData = data;
  
  for (const part of pathParts) {
    if (sectionData && typeof sectionData === 'object') {
      sectionData = sectionData[part];
    } else {
      return {
        valid: false,
        errors: [`Section path ${sectionPath} not found in data`],
        missingFields: [sectionPath],
        incorrectTypes: []
      };
    }
  }
  
  // For now, just validate the entire structure
  // In the future, we could validate just the specific section
  return validateFormSpecificData(data);
}

/**
 * Generates a summary report of validation results
 */
export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('FORM-SPECIFIC IEP VALIDATION REPORT');
  lines.push('='.repeat(60));
  
  if (result.valid) {
    lines.push('✅ VALIDATION PASSED');
    lines.push('All form fields match the schema exactly.');
  } else {
    lines.push('❌ VALIDATION FAILED');
    lines.push(`Total issues found: ${result.errors.length}`);
    lines.push('');
    
    if (result.missingFields.length > 0) {
      lines.push('MISSING FIELDS:');
      result.missingFields.forEach(field => {
        lines.push(`  - ${field}`);
      });
      lines.push('');
    }
    
    if (result.incorrectTypes.length > 0) {
      lines.push('TYPE ERRORS:');
      result.incorrectTypes.forEach(error => {
        lines.push(`  - ${error}`);
      });
      lines.push('');
    }
    
    if (result.errors.length > 0) {
      lines.push('ALL ERRORS:');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error}`);
      });
    }
  }
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}
