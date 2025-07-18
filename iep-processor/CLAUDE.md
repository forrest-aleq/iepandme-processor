# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Run the IEP processor in development mode using tsx
- `npm run build` - Compile TypeScript to JavaScript in dist/ directory
- `npm run clean` - Remove compiled output from dist/
- `npm run setup` - Initial setup: install dependencies and build

### Testing Commands
- `npm run test` - Run batch tests on all IEP files in samples/ directory
- `npm run test:single <file>` - Test a single IEP file with detailed output
- `npm run test:accuracy` - Run accuracy validation tests against expected results

### Environment Setup
API keys are required in `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
LOG_LEVEL=info (optional)
MAX_CONCURRENT=2 (optional)
```

### Model Configuration
The system is configured to use:
- **Claude 4 Opus** (`claude-opus-4-20250514`) - Primary model for complex text extraction
- **OpenAI o3** (`o3-2025-04-16`) - Secondary model with high reasoning effort for structured data

## Architecture Overview

### Dual-Model AI Extraction
The system uses both Claude 4 Opus and OpenAI o3 for redundancy:
- Processes documents with both models simultaneously
- Implements intelligent consensus merging of results
- Falls back to single model if one fails
- Provides confidence scoring based on agreement

### Document Processing Pipeline
1. **Format Detection**: Supports PDF, DOCX, and TXT files
2. **Text Extraction**: Uses appropriate parser (pdf-parse, mammoth)
3. **AI Processing**: Structured extraction with both AI models
4. **Validation**: Business rules and completeness checks
5. **Consensus**: Merges results from both models

### Key Components
- `src/index.ts` - Main IEP processor with dual-model extraction, consensus merging, and validation
- `src/test-runner.ts` - Batch testing framework for all samples with detailed reporting
- `src/test-single.ts` - Single file testing with detailed output and confidence scoring
- `src/accuracy-test.ts` - Accuracy validation against expected results using validation.json

## Data Structure

### IEP Data Model
All extracted data follows strict TypeScript interfaces:
- Student information (name, DOB, grade, disability)
- Annual goals with baselines and target criteria
- Special education services with frequencies
- Accommodations and modifications
- Transition plans (required for students 16+)

### Validation Rules
- Required fields: student name, date of birth, disability type, at least one goal
- Business rules: transition plans for students 16+
- Data completeness scoring affects confidence levels

## File Organization

### Input/Output
- `samples/` - Place IEP test files here (PDF, DOCX, TXT)
- `output/` - Test results and extracted data saved here
- `dist/` - Compiled JavaScript output (after build)

### Testing Strategy
Three testing approaches:
1. **Batch Testing** - Process all files in samples/, generate success/failure reports
2. **Single File Testing** - Detailed extraction for individual files
3. **Accuracy Testing** - Compare extracted data against expected results

## Success Criteria

The system is considered ready for production when:
- 80%+ files process successfully
- 80%+ average confidence score
- All required fields extracted consistently
- Validation errors are minimal

## Development Notes

### TypeScript Configuration
- ES2022 target with ESNext modules
- Strict mode enabled with comprehensive type checking
- Source maps and declarations generated

### No Traditional Testing Framework
Uses custom test runners instead of Jest/Mocha. The testing approach is file-based with detailed reporting and confidence scoring.

### Environment Requirements
- Node.js with ES modules support
- Modern Node.js version supporting ES2022 features
- API keys from both Anthropic and OpenAI required for dual-model processing

## Core Processing Functions

### Main Exported Functions
- `processIEPDocument(filePath, fileType)` - Main processing function that orchestrates dual-model extraction
- `extractWithClaude4(documentText)` - Claude 4 Opus extraction with enhanced reasoning
- `extractWithO3(documentText)` - OpenAI o3 extraction with high reasoning effort
- `validateIEPData(data)` - Comprehensive validation against business rules and schema requirements

### Processing Pipeline
1. **Document Text Extraction** - Supports PDF (pdf-parse), DOCX (mammoth), and TXT
   - *Note: Currently being migrated to deepdoctection for layout-aware processing*
2. **Parallel AI Processing** - Both models process simultaneously using Promise.allSettled
3. **Consensus Merging** - Intelligent field-by-field merging with confidence scoring
4. **Validation** - Business rules, required fields, and data completeness checks
5. **Result Packaging** - Structured output with metadata, confidence scores, and validation results

## Current Development Phase: deepdoctection Integration

### Active Migration Project
The system is currently undergoing a major enhancement to replace the basic text extraction layer with deepdoctection for layout-aware document processing. See `DEEPDOCTECTION_INTEGRATION_PLAN.md` for complete implementation details.

### Development Standards for deepdoctection Integration
- **Type Safety**: All new interfaces must have explicit type definitions for every field
- **Documentation**: All public functions require comprehensive docstrings with @param, @returns, @throws
- **Service Architecture**: Follow single responsibility principle with dedicated service classes
- **Async Operations**: All I/O operations must be properly async with error handling
- **Environment Configuration**: Use environment variables for all configuration (no hard-coded values)

### New Environment Variables for deepdoctection
```
DEEPDOCTECTION_PYTHON_PATH=/path/to/python/venv/bin/python
DEEPDOCTECTION_MODEL_CACHE=/path/to/model/cache
DEEPDOCTECTION_TIMEOUT_MS=60000
USE_DEEPDOCTECTION=false  # Feature flag for A/B testing
```

### Enhanced Processing Pipeline (Target State)
1. **Layout-Aware Document Extraction** - deepdoctection with table structure preservation
2. **Structured Document Processing** - Convert layout data to AI-optimized text
3. **Parallel AI Processing** - Enhanced prompts leveraging layout information
4. **Consensus Merging** - Improved confidence scoring with layout consistency
5. **Validation** - Structure-aware validation rules
6. **Result Packaging** - Enhanced output with layout quality metrics