export const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    const platform = (navigator as any).platform || '';
    
    // iPad detection (especially for modern iPads that report as Macintosh)
    const isIPad = /iPad/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIPad) return "iPad";
    
    if (/iPhone|iPod/.test(ua)) return "iPhone";
    if (/android/i.test(ua)) return "Android";
    
    // Desktop platforms
    if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || /Mac/.test(platform)) return "Mac";
    if (/Win32|Win64|Windows|WinCE/.test(ua) || /Win/.test(platform)) return "Windows";
    if (/Linux/.test(platform)) return "Linux";
    
    // Generic mobile fallback
    if (/Mobi|Android/i.test(ua)) return "Mobile";
    
    return "Ordinateur";
};
