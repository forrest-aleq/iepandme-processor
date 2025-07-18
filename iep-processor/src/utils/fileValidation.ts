import fs from 'fs';

interface FileValidation {
  isValid: boolean;
  errors: string[];
  fileSizeInMB: number;
}

export function validateFileForOpenAI(filePath: string): FileValidation {
  const errors: string[] = [];
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { isValid: false, errors: ['File does not exist'], fileSizeInMB: 0 };
  }
  
  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  
  // OpenAI file size limits
  const MAX_SIZE_MB = 512;
  if (fileSizeInMB > MAX_SIZE_MB) {
    errors.push(`File size ${fileSizeInMB.toFixed(2)}MB exceeds OpenAI limit of ${MAX_SIZE_MB}MB`);
  }
  
  // Check file extension
  const ext = filePath.toLowerCase().split('.').pop();
  const supportedExtensions = ['pdf', 'docx', 'txt'];
  if (!ext || !supportedExtensions.includes(ext)) {
    errors.push(`Unsupported file type: ${ext}. Supported: ${supportedExtensions.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fileSizeInMB
  };
}