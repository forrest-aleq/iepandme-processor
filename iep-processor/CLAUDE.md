# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build TypeScript:**
```bash
npm run build
```

**Development mode:**
```bash
npm run dev
```

**Test all files:**
```bash
npm run test
```

**Test single file:**
```bash
npm run test:single ./samples/your_file.pdf
```

**Test with different models:**
```bash
npm run test:claude4-opus
npm run test:claude4-sonnet
npm run test:o4mini
```

**Compare model performance:**
```bash
npm run test:compare
```

**Accuracy testing:**
```bash
npm run test:accuracy
```

**Legacy testing:**
```bash
npm run test:legacy
```

**Clean build files:**
```bash
npm run clean
```

**Setup project:**
```bash
npm run setup
```

## Project Architecture

This is a **TypeScript CLI tool** for AI-powered extraction of IEP (Individualized Education Program) documents using OpenAI and Anthropic APIs.

**Current Status**: Post-nuclear cleanup with focused architecture
- **Primary Extractor**: `src/extractors/schema-compliant-extractor.ts` (OpenAI o4-mini with reasoning)
- **Schema**: `the_schema.json` - Form-specific schema matching exact IEP form structure
- **Testing**: `src/test-single.ts` for individual file testing
- **Samples**: `samples/` directory contains real IEP PDFs for testing

**Key Technologies:**
- **TypeScript** with strict mode, ESNext modules
- **OpenAI API** (o4-mini model with Responses API and reasoning)
- **Anthropic Claude** (backup model)
- **PDF Processing** via OpenAI Files API
- **Schema Validation** planned with AJV

**Critical Architecture Notes:**
- Uses **form-specific extraction** matching exact form field names from `the_schema.json`
- Schema structure follows IEP form sections 1-15 with exact field names (e.g., "CHILD'S INFORMATION" → "NAME")
- Processing pipeline extracts to match canonical school district form structure
- Cost tracking and API usage monitoring built-in
- Main extractor uses schema-compliant interfaces defined in `schema-compliant-extractor.ts:17-50`

## Key Files

```
src/
├── extractors/
│   └── schema-compliant-extractor.ts  # Main extraction logic with OpenAI integration
├── test-single.ts                     # Single file testing script
├── test-runner.ts                     # Batch testing (legacy)
├── test-runner-dist.ts               # Batch testing (compiled)
└── accuracy-test.ts                   # Accuracy validation
samples/                               # IEP PDF test files
output/                                # Extraction results with timestamps
the_schema.json                        # Form-specific schema (primary)
schema.json                            # Alternative schema
```

## IEP Processing Workflow

1. **Document Upload**: PDF files placed in `samples/` directory
2. **Extraction**: `schema-compliant-extractor.ts` processes via OpenAI Files API
3. **Schema Compliance**: Output structured to match `the_schema.json` format with schema-compliant interfaces
4. **Validation**: Results validated against form-specific schema
5. **Output**: JSON files saved to `output/` directory with timestamps and cost reports

## Environment Setup

**Required Environment Variables** (`.env`):
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

## Testing and Quality Assurance

- **Unit Tests**: Individual PDF processing with accuracy validation
- **Ground Truth**: Manual verification against sample IEPs from `readme.md` checklist
- **Model Comparison**: Testing across OpenAI o4-mini and Claude models via different npm scripts
- **Accuracy Metrics**: Field completeness and extraction accuracy tracking
- **Success Criteria**: 80%+ files process successfully, 80%+ average confidence score

## Development Notes

- **Extraction Focus**: Currently prioritizing accuracy over speed
- **Form Structure**: Matches exact IEP form sections and field names from `the_schema.json`
- **API Usage**: Implements cost tracking and usage monitoring with detailed reports
- **Error Handling**: Comprehensive retry logic and fallback models
- **TypeScript**: Strict mode enabled with ESNext modules
- **File Processing**: Handles only PDF files via OpenAI Files API

## Troubleshooting

- **"API key not found"**: Check `.env` file exists with correct keys (no quotes)
- **"No text extracted"**: PDF might be image-based, check file format
- **Low accuracy scores**: Review `the_schema.json` field mappings or try different models
- **Build failures**: Run `npm run clean` then `npm run build`