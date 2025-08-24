import { UserRole } from '@/hooks/useUserRole';

// File size limits in bytes
export const FILE_SIZE_LIMITS = {
  free: {
    maxFileSize: 50 * 1024 * 1024, // 50MB per video
    maxTotalSize: 100 * 1024 * 1024 // 100MB total per session
  },
  premium: {
    maxFileSize: 200 * 1024 * 1024, // 200MB per video
    maxTotalSize: 500 * 1024 * 1024 // 500MB total per session
  },
  admin: {
    maxFileSize: 500 * 1024 * 1024, // 500MB per video
    maxTotalSize: 1024 * 1024 * 1024 // 1GB total per session
  }
};

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  rejectedFiles?: File[];
}

export function validateFiles(files: File[], userRole: UserRole = 'free'): ValidationResult {
  const limits = FILE_SIZE_LIMITS[userRole];
  const rejectedFiles: File[] = [];
  const validFiles: File[] = [];

  // Check individual file sizes
  for (const file of files) {
    if (file.size > limits.maxFileSize) {
      rejectedFiles.push(file);
    } else {
      validFiles.push(file);
    }
  }

  // Check total size of valid files
  const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
  
  if (totalSize > limits.maxTotalSize) {
    return {
      isValid: false,
      message: `Total file size (${formatFileSize(totalSize)}) exceeds limit (${formatFileSize(limits.maxTotalSize)}) for ${userRole} users.`,
      rejectedFiles: files
    };
  }

  if (rejectedFiles.length > 0) {
    const maxSizeFormatted = formatFileSize(limits.maxFileSize);
    return {
      isValid: rejectedFiles.length === 0,
      message: rejectedFiles.length === 1 
        ? `File "${rejectedFiles[0].name}" (${formatFileSize(rejectedFiles[0].size)}) exceeds the ${maxSizeFormatted} limit for ${userRole} users.`
        : `${rejectedFiles.length} files exceed the ${maxSizeFormatted} limit for ${userRole} users.`,
      rejectedFiles
    };
  }

  return { isValid: true };
}

export function validateSingleFile(file: File, userRole: UserRole = 'free'): ValidationResult {
  return validateFiles([file], userRole);
}

export function getTotalSize(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileSizeLimitsForRole(userRole: UserRole) {
  return FILE_SIZE_LIMITS[userRole];
}