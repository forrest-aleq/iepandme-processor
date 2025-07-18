# deepdoctection Integration Implementation Plan

## Overview
This document outlines the phased approach to replace the current preprocessing system (pdf-parse/mammoth) with deepdoctection for enhanced layout-aware document processing in the IEP processor.

## Phase 1: Environment Setup & Research (2-3 days)

### Tasks:
1. **Install deepdoctection in development environment**
   - Set up Python virtual environment alongside Node.js
   - Install deepdoctection with PyTorch/Detectron2
   - Verify installation with sample documents

2. **Create Python-Node.js bridge**
   - Install `python-shell` npm package for Node.js ↔ Python communication
   - Create basic Python script for deepdoctection testing
   - Test bi-directional data passing

3. **Benchmark current vs deepdoctection preprocessing**
   - Run deepdoctection on 5-10 sample IEP files
   - Compare output quality with current `pdf-parse`/`mammoth` extraction
   - Document layout preservation improvements

4. **Design new data structures**
   - Define TypeScript interfaces for structured document data
   - Plan how to represent tables, layout regions, reading order
   - Design conversion from deepdoctection output to your AI model input

---

## Phase 2: Core Integration Development (3-4 days)

### Tasks:
1. **Create Python extraction module**
   - `src/extractors/deepdoctection-extractor.py`
   - Configure deepdoctection pipeline for IEP documents
   - Handle PDF, DOCX, and image inputs
   - Return structured JSON with layout information

2. **Define explicit TypeScript interfaces**
   - `src/types/structured-document.ts` - Complete type definitions
   - `StructuredDocument` interface with all fields explicitly typed
   - `LayoutRegion`, `TableStructure`, `TextBlock` interfaces
   - Follow "Give every parameter and return value an explicit type" rule

3. **Build deepdoctection service class**
   - `src/services/deepdoctection.service.ts` - Dedicated service following modularity principle
   - Implement proper async/await for all I/O operations
   - Use child process streams instead of python-shell for robustness
   - Add comprehensive error handling and timeout management

4. **Create structured document processor**
   - `src/processors/structured-document.ts`
   - Convert deepdoctection layout data to readable text
   - Preserve table structures as formatted text
   - Maintain spatial relationships and reading order

5. **Replace core extraction function**
   - Modify `extractDocumentText()` in `src/index.ts`
   - Add feature flag for A/B testing (old vs new)
   - Maintain backward compatibility during transition

6. **Add dependency management**
   - Create `requirements.txt` for Python dependencies
   - Update `package.json` with new Node.js dependencies
   - Configure environment variables for Python paths

---

## Phase 3: AI Model Integration (2-3 days)

### Tasks:
1. **Enhance AI prompts for structured input**
   - Update Claude 4 prompts to leverage layout information
   - Modify o4-mini prompts to use table structure hints
   - Add instructions for processing preserved formatting

2. **Update consensus merging logic**
   - Modify `compareAndMerge()` to handle richer input data
   - Improve confidence scoring based on layout consistency
   - Add validation for table structure preservation

3. **Enhance validation system**
   - Update `validateIEPData()` to check structural completeness
   - Add layout-based validation rules
   - Verify table extraction accuracy

4. **Create structured output debugging**
   - Add visualization of detected layout regions
   - Log table extraction quality metrics
   - Debug tools for layout analysis troubleshooting

---

## Phase 4: Testing & Validation (3-4 days)

### Tasks:
1. **Update test frameworks**
   - Modify `test-runner.ts` for A/B comparison testing
   - Update `test-single.ts` with layout analysis reporting
   - Enhance `accuracy-test.ts` with structure-aware validation

2. **Run comprehensive testing**
   - Test all sample files with both old and new systems
   - Compare extraction accuracy and confidence scores
   - Measure processing time impact

3. **Performance optimization**
   - Optimize Python process spawning/reuse
   - Implement caching for repeated documents
   - Fine-tune deepdoctection pipeline settings

4. **Create migration validation**
   - Ensure no regression in current successful extractions
   - Validate improvement in previously failed cases
   - Document performance characteristics

---

## Phase 5: Production Deployment (1-2 days)

### Tasks:
1. **Environment configuration**
   - Update deployment scripts to include Python dependencies
   - Configure production environment variables
   - Test deployment pipeline

2. **Feature flag removal**
   - Remove old preprocessing system after validation
   - Clean up legacy code and dependencies
   - Update documentation

3. **Monitoring setup**
   - Add metrics for layout detection quality
   - Monitor processing time changes
   - Track extraction accuracy improvements

4. **Documentation updates**
   - Update CLAUDE.md with new architecture
   - Document new dependencies and setup requirements
   - Create troubleshooting guide for deepdoctection issues

---

## Expected Outcomes

### Success Metrics:
- **Extraction accuracy**: 80% → 90%+ success rate
- **Table preservation**: Structured data instead of flat text
- **Processing quality**: Better handling of complex layouts
- **Confidence scores**: Higher average confidence due to better input

### Risk Mitigation:
- **Feature flag approach**: Can rollback if issues arise
- **Parallel testing**: Validate improvements before full switch
- **Dependency isolation**: Python environment separate from Node.js core
- **Performance monitoring**: Ensure processing time remains acceptable

---

## Current System Analysis

### Existing Preprocessing (to be replaced):
```typescript
// src/index.ts:237-258
async function extractDocumentText(filePath: string, fileType: string): Promise<string> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      const pdfBuffer = readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfData.text; // ← Flat text only
      
    case 'docx':
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value; // ← No layout preservation
      
    default:
      return readFileSync(filePath, 'utf8');
  }
}
```

### Limitations of Current System:
- No layout understanding
- No table structure preservation
- No spatial relationship awareness
- Limited handling of complex formatting
- Poor multi-column layout support

### Target New System:
```typescript
async function extractStructuredDocument(filePath: string, fileType: string): Promise<StructuredDocument> {
  // deepdoctection integration with:
  // - Layout region detection
  // - Table structure preservation
  // - Reading order optimization
  // - Multi-modal content handling
}
```

---

## Technical Standards Compliance

### Type Safety Requirements:
- **Explicit Type Definitions**: All new interfaces must have explicit types for every field
- **No `any` types**: Follow strict TypeScript compilation rules
- **Return value typing**: Every function must have explicit return type annotations

### Code Quality Standards:
- **Docstring Requirements**: All public functions must have triple-quoted docstrings with:
  - Purpose description
  - `@param` documentation for all parameters
  - `@returns` documentation
  - `@throws` documentation for possible exceptions
- **Service Modularity**: One domain responsibility per module/service class
- **Async Performance**: All blocking I/O operations must be properly async

### Configuration Management:
- **Environment Variables**: No hard-coded paths or configuration
- **Python Path Configuration**: `DEEPDOCTECTION_PYTHON_PATH` environment variable
- **Model Cache Path**: `DEEPDOCTECTION_MODEL_CACHE` environment variable
- **Processing Timeout**: `DEEPDOCTECTION_TIMEOUT_MS` environment variable

---

## Dependencies

### Python Dependencies (requirements.txt):
```
deepdoctection>=0.15.0
torch>=2.2.0
detectron2>=0.6.0
pillow>=9.0.0
numpy>=1.21.0
```

### Node.js Dependencies (package.json additions):
```json
{
  "dependencies": {
    "@types/node": "^20.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0"
  }
}
```

### Environment Requirements:
- Linux or macOS (Windows not directly supported by deepdoctection)
- Python 3.9+ with virtual environment
- Node.js 18+ with ES2022 support
- GPU optional but recommended for performance
- Additional disk space for pre-trained models (~2-4GB)

---

## Implementation Notes

### Architecture Decision:
- Keep existing dual-model AI system (Claude + o4-mini)
- Replace only the preprocessing layer
- Maintain all validation and consensus merging logic
- Preserve current API interfaces where possible

### Testing Strategy:
- A/B testing with feature flags
- Parallel processing for comparison
- Gradual rollout with monitoring
- Fallback capability to original system

### Performance Considerations:
- Python process overhead (mitigated with process reuse)
- Model loading time (cached after first use)
- Increased accuracy should offset processing time
- Monitor memory usage with larger models

---

## Example Implementation Signatures

### Service Class Structure:
```typescript
/**
 * Service for handling deepdoctection document processing integration
 * Follows single responsibility principle for layout-aware document extraction
 */
export class DeepDoctectionService {
  /**
   * Process document using deepdoctection for layout-aware extraction
   * @param filePath - Absolute path to the document file
   * @param fileType - Document type (pdf|docx|txt)
   * @param options - Processing options including timeout and model settings
   * @returns Promise resolving to structured document with layout information
   * @throws DeepDoctectionError when processing fails
   * @throws TimeoutError when processing exceeds configured timeout
   */
  public async processDocument(
    filePath: string,
    fileType: DocumentType,
    options?: ProcessingOptions
  ): Promise<StructuredDocument>;
}
```

### Type Definitions:
```typescript
export interface StructuredDocument {
  readonly metadata: DocumentMetadata;
  readonly layoutRegions: readonly LayoutRegion[];
  readonly tables: readonly TableStructure[];
  readonly textBlocks: readonly TextBlock[];
  readonly readingOrder: readonly number[];
}

export interface LayoutRegion {
  readonly id: string;
  readonly type: 'header' | 'paragraph' | 'table' | 'image' | 'footer';
  readonly bbox: BoundingBox;
  readonly confidence: number;
  readonly text: string;
}

export interface TableStructure {
  readonly id: string;
  readonly bbox: BoundingBox;
  readonly rows: readonly TableRow[];
  readonly confidence: number;
}
```