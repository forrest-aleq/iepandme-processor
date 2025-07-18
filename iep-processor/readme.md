# IEP Processor Quick Setup & Testing

## 🚀 Quick Start

1. **Save the setup script** as `setup.sh` and make it executable:
```bash
chmod +x setup.sh
./setup.sh
```

2. **Add your API keys** to `.env`:
```bash
# Get keys from:
# - Anthropic: https://console.anthropic.com/
# - OpenAI: https://platform.openai.com/api-keys

ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

3. **Copy your IEP test files** to the `samples/` directory:
```bash
cp /path/to/your/iep1.pdf ./samples/
cp /path/to/your/iep2.pdf ./samples/
```

4. **Run accuracy tests**:
```bash
# Test all files
npm run test

# Test single file  
npm run test:single ./samples/your_iep.pdf
```

## 📁 Project Structure
```
iep-processor/
├── src/
│   ├── index.ts           # Main IEP processor
│   ├── test-runner.ts     # Batch testing
│   ├── test-single.ts     # Single file testing
│   └── accuracy-test.ts   # Accuracy validation
├── samples/               # Put your IEP files here
├── output/                # Test results go here
├── .env                   # API keys
└── package.json
```

## 🧪 Testing Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Test all IEP files in samples/ |
| `npm run test:single <file>` | Test specific file with detailed output |
| `npm run accuracy` | Compare against expected results |
| `npm run dev` | Run in development mode |

## 🎯 What to Test For

**Student Information:**
- [ ] Name extracted correctly
- [ ] Date of birth found
- [ ] Grade level identified
- [ ] Primary disability captured

**Goals:**
- [ ] All annual goals extracted
- [ ] Baseline data captured
- [ ] Target criteria identified
- [ ] Measurement methods found

**Services & Accommodations:**
- [ ] Special education services listed
- [ ] Service frequencies captured
- [ ] Accommodations identified
- [ ] Testing modifications found

## 📊 Interpreting Results

**Confidence Scores:**
- `90-100%`: Excellent extraction
- `70-89%`: Good extraction, minor gaps
- `50-69%`: Fair extraction, review needed
- `<50%`: Poor extraction, needs attention

**Validation Errors:**
- Missing required fields (name, DOB, disability, goals)
- Business rule violations (missing transition plans for 16+)

**Validation Warnings:**
- Missing optional but important data
- Age-appropriate content gaps

## 🔧 Troubleshooting

**"API key not found" errors:**
- Check `.env` file exists and has correct keys
- Ensure no quotes around API keys

**"No text extracted" errors:**
- PDF might be image-based (needs OCR)
- Document might be corrupted
- Try converting to different format

**Low confidence scores:**
- Document format might be unusual
- Try testing with different IEP formats
- Check if document is complete

## 📈 Next Steps After Testing

1. **If accuracy is good (>80%)**: Ready for Supabase integration
2. **If accuracy is fair (60-80%)**: Tune prompts and retry
3. **If accuracy is poor (<60%)**: May need document preprocessing

## 🎉 Success Criteria

✅ **Ready for production when:**
- 80%+ files process successfully
- 80%+ average confidence score
- All required fields extracted consistently
- Validation errors are minimal

---

**Questions?** The test runner will show detailed results and recommendations for improving accuracy.