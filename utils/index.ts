// utils/index.ts

// Export from format.ts
export {
    camelToSnakeCase, capitalize, chunkArray, debounce, deepClone, extractHashtags,
    extractMentions, formatCurrency, formatDate, formatDuration, formatFileSize, formatFullDate,
    formatNumber, formatPhoneNumber, formatTextWithLinks, generateRandomString, getContrastColor, getDomainFromUrl, getMediaTypeFromUrl, getStorageItem, hexToRgba, isAndroid, isDesktop, isiOS, isMobile, isValidEmail, isValidPassword, isValidUrl, isValidUsername, mergeObjects,
    omit,
    pick, removeStorageItem, setStorageItem, shuffleArray, slugify, snakeToCamelCase, throttle, truncateText, uniqueArray
} from './format';

// Export from links.ts (exclude normalizeUrl to avoid conflict)
export {
    APP_LINKING_PREFIXES, copyToClipboard, DEEP_LINK_PATTERNS, extractPathFromDeepLink, generateCommunityLink, generatePostLink, generateTagLink, generateUserLink, handleDeepLink, isAppInstalled, isDeepLink, mapPathToExpoRoute,
    matchDeepLinkPattern, openEmail, openMaps, openPhone, openSocialProfile, openUrl, ROUTE_MAP, setupDeepLinking, shareContent
} from './links';

// Export normalizeUrl specifically from links.ts
export { normalizeUrl } from './links';

// Export from validation.ts
export {
    createValidator, validateBio, validateCommentContent, validateEmail, validateFile,
    validateForm, validateFullName, validatePassword, validatePhoneNumber,
    validatePostContent, validateUrl, validateUsername
} from './validation';

// Re-export types
export type { ValidationResult } from './validation';
