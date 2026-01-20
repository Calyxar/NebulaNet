// utils/validation.ts

// Validation interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Username validation
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = [];
  
  if (!username) {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (username.length > 20) {
      errors.push('Username must be less than 20 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    if (/^[0-9]/.test(username)) {
      errors.push('Username cannot start with a number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Full name validation
export function validateFullName(fullName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!fullName) {
    errors.push('Full name is required');
  } else {
    if (fullName.length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    if (fullName.length > 50) {
      errors.push('Full name must be less than 50 characters');
    }
    if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
      errors.push('Full name can only contain letters, spaces, hyphens, and apostrophes');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// URL validation
export function validateUrl(url: string, required: boolean = false): ValidationResult {
  const errors: string[] = [];
  
  if (required && !url) {
    errors.push('URL is required');
  } else if (url) {
    try {
      new URL(url.includes('://') ? url : `https://${url}`);
    } catch {
      errors.push('Please enter a valid URL');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Phone number validation
export function validatePhoneNumber(phoneNumber: string, required: boolean = false): ValidationResult {
  const errors: string[] = [];
  
  if (required && !phoneNumber) {
    errors.push('Phone number is required');
  } else if (phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      errors.push('Phone number must be at least 10 digits');
    }
    if (!/^[0-9+\-\s()]+$/.test(phoneNumber)) {
      errors.push('Please enter a valid phone number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Post content validation
export function validatePostContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content.trim()) {
    errors.push('Post content is required');
  } else if (content.length > 5000) {
    errors.push('Post content must be less than 5000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Comment content validation
export function validateCommentContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content.trim()) {
    errors.push('Comment content is required');
  } else if (content.length > 1000) {
    errors.push('Comment content must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Bio validation
export function validateBio(bio: string): ValidationResult {
  const errors: string[] = [];
  
  if (bio && bio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// File validation
export function validateFile(
  file: File | { size: number; type: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    required?: boolean;
  } = {}
): ValidationResult {
  const { maxSize = 50 * 1024 * 1024, allowedTypes = [], required = false } = options;
  const errors: string[] = [];
  
  if (required && !file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }
  
  if (file) {
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      errors.push(`File size must be less than ${maxSizeMB}MB`);
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Form validation helper
export function validateForm<T extends Record<string, any>>(
  formData: T,
  validators: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult {
  const errors: string[] = [];
  let isValid = true;
  
  for (const [field, validator] of Object.entries(validators)) {
    const value = formData[field as keyof T];
    const result = validator(value);
    
    if (!result.isValid) {
      isValid = false;
      errors.push(...result.errors.map(error => `${field}: ${error}`));
    }
  }
  
  return {
    isValid,
    errors,
  };
}

// Create a validator function
export function createValidator<T>(
  rules: {
    test: (value: T) => boolean;
    message: string;
  }[]
): (value: T) => ValidationResult {
  return (value: T) => {
    const errors: string[] = [];
    
    for (const rule of rules) {
      if (!rule.test(value)) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
}

// Export all validators
export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validateFullName,
  validateUrl,
  validatePhoneNumber,
  validatePostContent,
  validateCommentContent,
  validateBio,
  validateFile,
  validateForm,
  createValidator,
};