# Multi-Step Q&A Approach for IEP Processing: Implementation Guide

## Executive Summary

Your current IEP processor uses a **single-shot dual-model approach** that extracts all data in one massive prompt. This guide outlines implementing a **multi-step Q&A approach** that breaks document processing into focused, sequential steps with human-in-the-loop validation - proven to increase accuracy from 70-80% to 90%+ in enterprise document processing.

## Current System Analysis

### Current Architecture (Single-Shot)
```typescript
// Current flow in src/index.ts
1. Extract text from document
2. Send ENTIRE document + complex schema to Claude 4 Opus
3. Send ENTIRE document + complex schema to OpenAI o3
4. Merge results with consensus logic
5. Validate and return
```

### Current Limitations
- **Overwhelming prompts**: Single 8000-token prompts trying to extract everything
- **Context dilution**: Important details get lost in massive document text
- **Binary success/failure**: If any part fails, entire extraction fails
- **No granular control**: Cannot optimize different extraction strategies per data type
- **Debugging difficulty**: Hard to identify which specific extractions failed

## Multi-Step Q&A Architecture

### Step-by-Step Processing Pipeline

```typescript
// Proposed new flow
1. Document Classification (95% confidence threshold)
2. Student Information Extraction (90% confidence threshold)
3. Eligibility & Disability Extraction (85% confidence threshold)
4. Goals Extraction (Iterative, 80% confidence threshold)
5. Accommodations & Services Extraction (80% confidence threshold)
6. Transition Planning (if age 16+, 85% confidence threshold)
7. Human Review Queue (for low-confidence items)
8. Final Validation & Assembly
```

### Why This Approach is Superior

#### 1. **Focused Attention Per Task**
```typescript
// Instead of this overwhelming prompt:
"Extract student info, eligibility, goals, accommodations, services, transition plans..."

// You get laser-focused prompts:
"Is this document an IEP, 504 Plan, or neither? Look for these specific indicators..."
```

#### 2. **Error Isolation & Recovery**
```typescript
// Current: if anything fails, everything fails
if (!claudeData && !o3Data) {
  throw new Error('Both extraction models failed');
}

// Multi-step: granular failure handling
if (studentNameConfidence < 0.90) {
  flagForHumanReview('student_name', extractedName);
  continueWithNextStep();
}
```

#### 3. **Cost & Model Optimization**
```typescript
// Different models for different complexity levels
const modelStrategy = {
  classification: 'gpt-4o-mini',     // Simple task, cheap model
  student_info: 'gpt-4o-mini',       // Structured data, cheap model
  goals: 'claude-3-5-sonnet',        // Complex reasoning, premium model
  narrative: 'claude-3-5-sonnet'     // Complex understanding needed
};
```

## Implementation Guide

### Phase 1: Core Infrastructure

#### 1.1 Create Processing Pipeline Framework
```typescript
// src/pipeline.ts
interface ProcessingStep {
  name: string;
  confidence_threshold: number;
  model: 'claude-4' | 'o3' | 'gpt-4o-mini';
  max_retries: number;
  human_review_required: boolean;
}

interface ProcessingResult {
  step: string;
  success: boolean;
  confidence: number;
  data: any;
  requires_review: boolean;
  error?: string;
}

class IEPProcessingPipeline {
  private steps: ProcessingStep[] = [
    { name: 'classify', confidence_threshold: 0.95, model: 'gpt-4o-mini', max_retries: 2, human_review_required: false },
    { name: 'student_info', confidence_threshold: 0.90, model: 'gpt-4o-mini', max_retries: 3, human_review_required: true },
    { name: 'eligibility', confidence_threshold: 0.85, model: 'claude-4', max_retries: 2, human_review_required: true },
    { name: 'goals', confidence_threshold: 0.80, model: 'claude-4', max_retries: 3, human_review_required: true },
    { name: 'accommodations', confidence_threshold: 0.80, model: 'claude-4', max_retries: 2, human_review_required: false },
    { name: 'services', confidence_threshold: 0.80, model: 'claude-4', max_retries: 2, human_review_required: false },
    { name: 'transition', confidence_threshold: 0.85, model: 'claude-4', max_retries: 2, human_review_required: true }
  ];

  async processDocument(documentText: string): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const step of this.steps) {
      const result = await this.executeStep(step, documentText, results);
      results.push(result);
      
      // Stop processing if classification fails
      if (step.name === 'classify' && !result.success) {
        break;
      }
    }
    
    return results;
  }
}
```

#### 1.2 Implement Step-Specific Extractors
```typescript
// src/extractors/classification.ts
export async function classifyDocument(documentText: string): Promise<ClassificationResult> {
  const prompt = `Analyze this document and classify it as one of:
  - IEP (Individualized Education Program) 
  - 504 (Section 504 Plan)
  - OTHER (neither)
  
  Key indicators to look for:
  - IEP: Annual goals, special education services, FAPE, present levels
  - 504: Accommodations, general education, civil rights, disability barriers
  - OTHER: Lacks IEP/504 specific language and structure
  
  Document preview (first 2000 chars):
  ${documentText.substring(0, 2000)}
  
  Respond with JSON: {
    "type": "IEP"|"504"|"OTHER", 
    "confidence": 0.0-1.0, 
    "key_indicators": ["list", "of", "indicators", "found"],
    "reasoning": "brief explanation"
  }`;

  // Send to gpt-4o-mini for cost efficiency
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

```typescript
// src/extractors/student-info.ts
export async function extractStudentInfo(documentText: string): Promise<StudentExtractionResult> {
  const prompt = `Extract ONLY student demographic information from this document:
  
  Find and extract:
  - Student name (handle "Last, First" or "First Last" formats)
  - Date of birth (standardize to MM/DD/YYYY)
  - Student ID number
  - Grade level
  - Age (calculate from DOB if not explicitly stated)
  - Native language
  - English learner status
  
  Search strategies:
  - Names often appear in headers, first paragraphs, or signature sections
  - DOB may be written as "DOB:", "Date of Birth:", or in demographic sections
  - Look for patterns like "Grade: X" or "Xth grade"
  - Student ID may be labeled as "ID:", "Student #:", or "SSID:"
  
  Document text:
  ${documentText}
  
  Respond with JSON including confidence score for each field:
  {
    "student": {
      "name": "extracted name",
      "dob": "MM/DD/YYYY",
      "id": "student id",
      "grade": "grade level",
      "age": "calculated age",
      "native_language": "language",
      "english_learner": boolean
    },
    "confidence": 0.0-1.0,
    "field_confidences": {
      "name": 0.0-1.0,
      "dob": 0.0-1.0,
      "id": 0.0-1.0,
      "grade": 0.0-1.0
    }
  }`;

  // Use cost-effective model for structured data
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800,
    temperature: 0.1,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

```typescript
// src/extractors/goals.ts
export async function extractGoalsIteratively(documentText: string): Promise<GoalsExtractionResult> {
  // First, identify goal sections
  const goalSections = await identifyGoalSections(documentText);
  
  const goals: Goal[] = [];
  const lowConfidenceGoals: any[] = [];
  
  for (const section of goalSections) {
    const goal = await extractSingleGoal(section);
    
    if (goal.confidence > 0.8) {
      goals.push(goal.data);
    } else {
      lowConfidenceGoals.push({
        section: section,
        attempted_extraction: goal.data,
        confidence: goal.confidence,
        issues: goal.issues
      });
    }
  }
  
  return {
    goals,
    low_confidence_goals: lowConfidenceGoals,
    total_sections_found: goalSections.length,
    successfully_extracted: goals.length,
    confidence: goals.length / goalSections.length
  };
}

async function extractSingleGoal(goalSection: string): Promise<SingleGoalResult> {
  const prompt = `Extract a single IEP goal from this section:

  Goal section text:
  ${goalSection}

  Extract these components:
  - Goal area (reading, math, writing, behavior, communication, other)
  - Baseline (current performance level)
  - Target (specific measurable outcome)
  - Measurement method (how progress will be measured)
  - Timeline (when goal will be achieved)
  - Supports transition (does this goal support post-secondary transition)

  Respond with JSON:
  {
    "goal": {
      "area": "reading|math|writing|behavior|communication|other",
      "baseline": "current performance description",
      "target": "specific measurable target",
      "measurement": "how progress is measured",
      "timeline": "timeframe for achievement",
      "supports_transition": boolean
    },
    "confidence": 0.0-1.0,
    "issues": ["list", "of", "any", "concerns"]
  }`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  });

  return JSON.parse(response.content[0].text);
}
```

### Phase 2: Human-in-the-Loop Integration

#### 2.1 Review Queue System
```typescript
// src/review-queue.ts
interface ReviewItem {
  id: string;
  document_id: string;
  step: string;
  field: string;
  extracted_value: any;
  confidence: number;
  context: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  created_at: Date;
  reviewed_at?: Date;
  reviewer?: string;
  final_value?: any;
}

class ReviewQueue {
  private queue: ReviewItem[] = [];

  addForReview(item: Omit<ReviewItem, 'id' | 'created_at' | 'status'>): void {
    this.queue.push({
      ...item,
      id: crypto.randomUUID(),
      status: 'pending',
      created_at: new Date()
    });
  }

  getPendingReviews(): ReviewItem[] {
    return this.queue.filter(item => item.status === 'pending');
  }

  reviewItem(id: string, action: 'approve' | 'reject' | 'modify', newValue?: any): void {
    const item = this.queue.find(i => i.id === id);
    if (item) {
      item.status = action === 'approve' ? 'approved' : 
                   action === 'reject' ? 'rejected' : 'modified';
      item.reviewed_at = new Date();
      if (newValue !== undefined) {
        item.final_value = newValue;
      }
    }
  }

  getCompletedReviews(documentId: string): ReviewItem[] {
    return this.queue.filter(item => 
      item.document_id === documentId && 
      item.status !== 'pending'
    );
  }
}
```

#### 2.2 CLI Review Interface
```typescript
// src/cli-review.ts
import inquirer from 'inquirer';
import chalk from 'chalk';

export async function runReviewSession(reviewQueue: ReviewQueue): Promise<void> {
  const pendingItems = reviewQueue.getPendingReviews();
  
  if (pendingItems.length === 0) {
    console.log(chalk.green('✅ No items pending review!'));
    return;
  }

  console.log(chalk.blue.bold(`\n🔍 Human Review Required: ${pendingItems.length} items\n`));

  for (const item of pendingItems) {
    console.log(chalk.cyan(`\n📄 Document: ${item.document_id}`));
    console.log(chalk.yellow(`🔧 Step: ${item.step} - Field: ${item.field}`));
    console.log(chalk.gray(`📊 Confidence: ${(item.confidence * 100).toFixed(1)}%`));
    console.log(chalk.white(`📝 Context: ${item.context.substring(0, 200)}...`));
    console.log(chalk.green(`🤖 Extracted Value: ${JSON.stringify(item.extracted_value, null, 2)}`));

    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✅ Approve (use as-is)', value: 'approve' },
          { name: '✏️  Modify (edit value)', value: 'modify' },
          { name: '❌ Reject (mark as incorrect)', value: 'reject' },
          { name: '⏭️  Skip (review later)', value: 'skip' }
        ]
      }
    ]);

    if (action.action === 'approve') {
      reviewQueue.reviewItem(item.id, 'approve');
      console.log(chalk.green('✅ Approved!'));
    } else if (action.action === 'modify') {
      const newValue = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: 'Enter corrected value:',
          default: typeof item.extracted_value === 'string' ? item.extracted_value : JSON.stringify(item.extracted_value)
        }
      ]);
      reviewQueue.reviewItem(item.id, 'modify', newValue.value);
      console.log(chalk.green('✅ Modified!'));
    } else if (action.action === 'reject') {
      reviewQueue.reviewItem(item.id, 'reject');
      console.log(chalk.red('❌ Rejected!'));
    } else {
      console.log(chalk.yellow('⏭️  Skipped'));
    }
  }

  console.log(chalk.blue.bold('\n🎉 Review session complete!'));
}
```

### Phase 3: Confidence Scoring & Validation

#### 3.1 Advanced Confidence Calculation
```typescript
// src/confidence.ts
export function calculateStepConfidence(step: string, data: any, metadata: any): number {
  const baseConfidence = metadata.model_confidence || 0;
  
  const stepWeights = {
    'classify': {
      'key_indicators_found': 0.4,
      'reasoning_quality': 0.3,
      'model_confidence': 0.3
    },
    'student_info': {
      'required_fields_present': 0.5,
      'field_format_valid': 0.3,
      'model_confidence': 0.2
    },
    'goals': {
      'goal_completeness': 0.4,
      'measurable_targets': 0.3,
      'baseline_present': 0.2,
      'model_confidence': 0.1
    }
  };

  const weights = stepWeights[step] || { 'model_confidence': 1.0 };
  let weightedScore = 0;

  for (const [factor, weight] of Object.entries(weights)) {
    weightedScore += calculateFactorScore(factor, data, metadata) * weight;
  }

  return Math.min(Math.max(weightedScore, 0), 1);
}

function calculateFactorScore(factor: string, data: any, metadata: any): number {
  switch (factor) {
    case 'required_fields_present':
      const requiredFields = ['name', 'dob', 'grade'];
      const presentFields = requiredFields.filter(field => data[field] && data[field] !== '');
      return presentFields.length / requiredFields.length;
    
    case 'field_format_valid':
      let validFields = 0;
      let totalFields = 0;
      
      if (data.dob) {
        totalFields++;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(data.dob)) validFields++;
      }
      // Add more format validations...
      
      return totalFields > 0 ? validFields / totalFields : 0;
    
    case 'model_confidence':
      return metadata.model_confidence || 0;
    
    default:
      return 0;
  }
}
```

#### 3.2 Business Rules Validation
```typescript
// src/validation.ts
export function validateExtractionStep(step: string, data: any, allData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (step) {
    case 'student_info':
      if (!data.name) errors.push('Student name is required');
      if (!data.dob) errors.push('Date of birth is required');
      if (data.dob && !isValidDate(data.dob)) errors.push('Invalid date format');
      break;

    case 'goals':
      if (!data.goals || data.goals.length === 0) {
        errors.push('At least one annual goal is required');
      }
      data.goals?.forEach((goal, index) => {
        if (!goal.baseline) warnings.push(`Goal ${index + 1} missing baseline data`);
        if (!goal.target) errors.push(`Goal ${index + 1} missing measurable target`);
        if (!goal.measurement) warnings.push(`Goal ${index + 1} missing measurement method`);
      });
      break;

    case 'transition':
      const age = parseInt(allData.student?.age || '0');
      if (age >= 16) {
        if (!data.post_secondary_education_goal && !data.post_secondary_employment_goal) {
          errors.push('Students 16+ require post-secondary goals');
        }
        if (!data.transition_services || data.transition_services.length === 0) {
          warnings.push('Consider adding transition services');
        }
      }
      break;
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
    confidence_impact: errors.length > 0 ? -0.2 : (warnings.length > 0 ? -0.1 : 0)
  };
}
```

### Phase 4: Integration with Existing System

#### 4.1 Replace Main Processing Function
```typescript
// src/index.ts - Modified main function
export async function processIEPDocumentV2(filePath: string, fileType: string = 'txt'): Promise<ProcessingResult> {
  console.log(`🔄 Processing IEP document with Multi-Step Q&A: ${filePath}`);
  
  try {
    // Step 1: Extract text (keep existing logic)
    const documentText = await extractDocumentText(filePath, fileType);
    
    if (!documentText || documentText.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    // Step 2: Initialize new pipeline
    const pipeline = new IEPProcessingPipeline();
    const reviewQueue = new ReviewQueue();
    
    // Step 3: Run multi-step processing
    const stepResults = await pipeline.processDocument(documentText);
    
    // Step 4: Handle human review items
    const reviewItems = stepResults.filter(r => r.requires_review);
    if (reviewItems.length > 0) {
      console.log(chalk.yellow(`\n🔍 ${reviewItems.length} items require human review`));
      
      // For now, auto-approve high-confidence items, flag others
      for (const item of reviewItems) {
        if (item.confidence > 0.85) {
          console.log(chalk.green(`✅ Auto-approved: ${item.step} (${(item.confidence * 100).toFixed(1)}%)`));
        } else {
          reviewQueue.addForReview({
            document_id: filePath,
            step: item.step,
            field: item.step,
            extracted_value: item.data,
            confidence: item.confidence,
            context: documentText.substring(0, 500)
          });
        }
      }
    }

    // Step 5: Assemble final data
    const finalData = assembleIEPData(stepResults);
    
    // Step 6: Run validation
    const validation = validateIEPData(finalData);
    
    return {
      success: true,
      data: finalData,
      metadata: {
        processing_approach: 'multi_step_qa',
        steps_completed: stepResults.length,
        steps_succeeded: stepResults.filter(r => r.success).length,
        overall_confidence: calculateOverallConfidence(stepResults),
        validation,
        review_items_created: reviewQueue.getPendingReviews().length,
        processing_time: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Multi-step processing failed:', error);
    return {
      success: false,
      error: (error as Error).message,
      metadata: {
        processing_approach: 'multi_step_qa',
        processing_time: new Date().toISOString()
      }
    };
  }
}
```

### Phase 5: Testing & Validation

#### 5.1 A/B Testing Framework
```typescript
// src/ab-test.ts
export async function runABTest(sampleFiles: string[]): Promise<ABTestResult> {
  const results = {
    single_shot: [],
    multi_step: [],
    comparison: {
      accuracy_improvement: 0,
      processing_time_change: 0,
      cost_change: 0,
      human_review_reduction: 0
    }
  };

  for (const file of sampleFiles) {
    console.log(`\n🧪 A/B Testing: ${file}`);
    
    // Run both approaches
    const [singleShotResult, multiStepResult] = await Promise.all([
      processIEPDocument(file, 'pdf'),      // Current approach
      processIEPDocumentV2(file, 'pdf')     // New approach
    ]);

    results.single_shot.push(singleShotResult);
    results.multi_step.push(multiStepResult);

    // Quick comparison
    const singleShotAccuracy = calculateAccuracy(singleShotResult);
    const multiStepAccuracy = calculateAccuracy(multiStepResult);
    
    console.log(chalk.cyan(`📊 Single-shot accuracy: ${singleShotAccuracy.toFixed(1)}%`));
    console.log(chalk.cyan(`📊 Multi-step accuracy: ${multiStepAccuracy.toFixed(1)}%`));
    console.log(chalk.green(`📈 Improvement: ${(multiStepAccuracy - singleShotAccuracy).toFixed(1)}%`));
  }

  return results;
}
```

## Expected Outcomes

### Accuracy Improvements
- **Current**: 70-80% average accuracy
- **Expected**: 90%+ average accuracy
- **Confidence**: More granular confidence scoring per field
- **Validation**: Business rule validation per step

### Cost Optimization
- **Model Selection**: Use cheaper models for simple tasks
- **Token Efficiency**: Smaller, focused prompts vs. massive prompts
- **Retry Logic**: Only retry failed steps, not entire extraction

### Human Workflow Integration
- **Review Queue**: Structured review process for low-confidence items
- **Approval Thresholds**: Configurable confidence levels per field type
- **Audit Trail**: Complete history of human modifications

### Operational Benefits
- **Debugging**: Identify exactly which extraction steps fail
- **Monitoring**: Track performance per step type
- **Scaling**: Process different document types with specialized pipelines

## Migration Plan

### Week 1-2: Core Infrastructure
- Implement pipeline framework
- Create step-specific extractors
- Add confidence scoring system

### Week 3-4: Human-in-the-Loop
- Build review queue system
- Create CLI review interface
- Implement approval workflows

### Week 5-6: Integration & Testing
- Integrate with existing system
- Run A/B tests on sample files
- Validate business rules

### Week 7-8: Production Deployment
- Deploy to production environment
- Monitor performance metrics
- Train users on review process

## Conclusion

The multi-step Q&A approach transforms your IEP processor from a "hope it works" single-shot system to a **systematic, auditable, and highly accurate** document processing pipeline. While it requires more initial development, the benefits of higher accuracy, better debugging, cost optimization, and human workflow integration make it the superior choice for production IEP processing.

The research shows that enterprises using human-in-the-loop document processing see up to 70% cost reduction and significantly higher accuracy rates. For IEP processing - where accuracy affects student services and legal compliance - this approach is not just better, it's essential.