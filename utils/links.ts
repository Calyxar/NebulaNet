// utils/links.ts
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform, Share } from 'react-native';

// App linking configuration
export const APP_LINKING_PREFIXES = [
  'nebulanet://',
  'https://nebulanet.space',
  'https://www.nebulanet.space',
];

// Deep link patterns
export const DEEP_LINK_PATTERNS = {
  POST: /^\/post\/([^\/]+)$/,
  USER: /^\/user\/([^\/]+)$/,
  COMMUNITY: /^\/community\/([^\/]+)$/,
  TAG: /^\/tag\/([^\/]+)$/,
  SETTINGS: /^\/settings(\/([^\/]+))?$/,
};

// Route mapping for deep links
export const ROUTE_MAP: Record<string, string> = {
  '/': '/(tabs)/home',
  '/home': '/(tabs)/home',
  '/explore': '/(tabs)/explore',
  '/notifications': '/(tabs)/notifications',
  '/chat': '/(tabs)/chat',
  '/profile': '/(tabs)/profile',
  '/post/create': '/post/create',
  '/settings': '/settings',
  '/settings/preferences': '/settings/preferences',
  '/login': '/(auth)/login',
  '/signup': '/(auth)/signup',
  '/onboarding': '/(auth)/onboarding',
};

// Normalize URL - moved to top level to be exported
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Open URL with proper handling
export async function openUrl(url: string, options = {}): Promise<void> {
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    // Check if it's a deep link to our app
    if (isDeepLink(normalizedUrl)) {
      await handleDeepLink(normalizedUrl);
      return;
    }
    
    // External URL - open in browser
    if (Platform.OS === 'web') {
      window.open(normalizedUrl, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(normalizedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: '#007AFF',
        dismissButtonStyle: 'close',
        ...options,
      });
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    Alert.alert('Error', 'Could not open the link');
  }
}

// Check if URL is a deep link
export function isDeepLink(url: string): boolean {
  return APP_LINKING_PREFIXES.some(prefix => url.startsWith(prefix));
}

// Extract path from deep link
export function extractPathFromDeepLink(url: string): string {
  for (const prefix of APP_LINKING_PREFIXES) {
    if (url.startsWith(prefix)) {
      return url.replace(prefix, '');
    }
  }
  return url;
}

// Handle deep link
export async function handleDeepLink(url: string): Promise<void> {
  try {
    const path = extractPathFromDeepLink(url);
    
    // Map path to Expo Router path
    const expoPath = mapPathToExpoRoute(path);
    
    if (expoPath) {
      // Navigate using Expo Router
      const router = await import('expo-router');
      router.router.navigate(expoPath as any);
    } else {
      // Try to match with deep link patterns
      const matchedRoute = matchDeepLinkPattern(path);
      if (matchedRoute) {
        const router = await import('expo-router');
        router.router.navigate(matchedRoute as any);
      } else {
        // Fallback to home
        const router = await import('expo-router');
        router.router.navigate('/(tabs)/home');
      }
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
    Alert.alert('Error', 'Could not open the link');
  }
}

// Map web path to Expo Router path
export function mapPathToExpoRoute(path: string): string | null {
  // Direct mapping
  if (ROUTE_MAP[path]) {
    return ROUTE_MAP[path];
  }
  
  // Dynamic routes
  const postMatch = path.match(DEEP_LINK_PATTERNS.POST);
  if (postMatch) {
    return `/post/${postMatch[1]}`;
  }
  
  const userMatch = path.match(DEEP_LINK_PATTERNS.USER);
  if (userMatch) {
    return `/user/${userMatch[1]}`;
  }
  
  const communityMatch = path.match(DEEP_LINK_PATTERNS.COMMUNITY);
  if (communityMatch) {
    return `/community/${communityMatch[1]}`;
  }
  
  const tagMatch = path.match(DEEP_LINK_PATTERNS.TAG);
  if (tagMatch) {
    return `/tag/${tagMatch[1]}`;
  }
  
  return null;
}

// Match deep link pattern
export function matchDeepLinkPattern(path: string): string | null {
  for (const [pattern, regex] of Object.entries(DEEP_LINK_PATTERNS)) {
    const match = path.match(regex);
    if (match) {
      switch (pattern) {
        case 'POST':
          return `/post/${match[1]}`;
        case 'USER':
          return `/user/${match[1]}`;
        case 'COMMUNITY':
          return `/community/${match[1]}`;
        case 'TAG':
          return `/tag/${match[1]}`;
        case 'SETTINGS':
          return `/settings${match[1] || ''}`;
      }
    }
  }
  return null;
}

// Share content
export async function shareContent(
  title: string,
  message: string,
  url?: string
): Promise<void> {
  const shareUrl = url || 'https://nebulanet.space';
  const shareMessage = `${message}\n\n${shareUrl}`;
  
  if (Platform.OS === 'web') {
    // Web share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: message,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard(shareMessage);
      Alert.alert('Copied to clipboard', 'Link copied to clipboard');
    }
  } else {
    // React Native Share
    try {
      await Share.share({
        title,
        message: shareMessage,
        url: shareUrl,
      });
    } catch {
      console.log('Share cancelled');
    }
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
    } else {
      // Use expo-clipboard or react-native's Clipboard
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { setStringAsync } = await import('expo-clipboard');
        await setStringAsync(text);
      } else {
        // Fallback for other platforms
        Alert.alert('Copy to clipboard', 'Please copy manually: ' + text);
      }
    }
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// Generate shareable links
export function generatePostLink(postId: string): string {
  return `https://nebulanet.space/post/${postId}`;
}

export function generateUserLink(username: string): string {
  return `https://nebulanet.space/user/${username}`;
}

export function generateCommunityLink(slug: string): string {
  return `https://nebulanet.space/community/${slug}`;
}

export function generateTagLink(tag: string): string {
  return `https://nebulanet.space/tag/${encodeURIComponent(tag)}`;
}

// Open social media profiles
export async function openSocialProfile(
  platform: 'twitter' | 'instagram' | 'facebook' | 'linkedin',
  username: string
): Promise<void> {
  const urls: Record<string, string> = {
    twitter: `https://twitter.com/${username}`,
    instagram: `https://instagram.com/${username}`,
    facebook: `https://facebook.com/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
  };
  
  const url = urls[platform];
  if (url) {
    await openUrl(url);
  }
}

// Open email client
export async function openEmail(email: string, subject?: string, body?: string): Promise<void> {
  let mailtoUrl = `mailto:${email}`;
  
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);
  
  if (params.toString()) {
    mailtoUrl += `?${params.toString()}`;
  }
  
  await openUrl(mailtoUrl);
}

// Open phone dialer
export async function openPhone(phoneNumber: string): Promise<void> {
  const telUrl = `tel:${phoneNumber}`;
  await openUrl(telUrl);
}

// Open maps
export async function openMaps(
  address: string,
  latitude?: number,
  longitude?: number
): Promise<void> {
  let url: string;
  
  if (latitude && longitude) {
    url = `https://maps.google.com/?q=${latitude},${longitude}`;
  } else {
    url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  }
  
  await openUrl(url);
}

// Check if app is installed (iOS only)
export async function isAppInstalled(scheme: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  
  try {
    const { canOpenURL } = await import('expo-linking');
    return await canOpenURL(`${scheme}://`);
  } catch {
    return false;
  }
}

// Setup deep linking
export function setupDeepLinking(): void {
  if (Platform.OS !== 'web') {
    import('expo-linking').then(({ addEventListener, getInitialURL }) => {
      addEventListener('url', (event: { url: string }) => {
        handleDeepLink(event.url);
      });
      
      // Get initial URL
      getInitialURL().then((initialUrl: string | null) => {
        if (initialUrl) {
          handleDeepLink(initialUrl);
        }
      });
    });
  }
}