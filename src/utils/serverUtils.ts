import { SIGNALING_SERVER_URL, FALLBACK_SERVER_URLS } from '@env';

export interface ServerTestResult {
  url: string;
  success: boolean;
  responseTime?: number;
  error?: string;
}

export const testServerConnection = async (url: string): Promise<ServerTestResult> => {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      url,
      success: response.status < 400,
      responseTime,
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      url,
      success: false,
      responseTime,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
};

export const testAllServers = async (): Promise<ServerTestResult[]> => {
  const urls: string[] = [];

  if (SIGNALING_SERVER_URL) {
    urls.push(SIGNALING_SERVER_URL);
  }
  
  if (FALLBACK_SERVER_URLS) {
    const fallbackUrls = FALLBACK_SERVER_URLS.split(',').map(url => url.trim());
    fallbackUrls.forEach(url => {
      if (url && !urls.includes(url)) {
        urls.push(url);
      }
    });
  }

  const results = await Promise.all(
    urls.map(url => testServerConnection(url))
  );
  
  return results;
};

export const getServerStatus = (): {
  primary: string;
  fallbacks: string[];
  environment: string;
} => {
  const primary = SIGNALING_SERVER_URL || 'Not configured';
  const fallbacks = FALLBACK_SERVER_URLS 
    ? FALLBACK_SERVER_URLS.split(',').map(url => url.trim()).filter(url => url !== primary)
    : [];
    
  const environment = primary.includes('localhost') ? 'development' : 'production';
  
  return {
    primary,
    fallbacks,
    environment,
  };
};
