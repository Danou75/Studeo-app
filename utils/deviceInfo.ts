export const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    const platform = (navigator as any).platform || '';
    
    // 1. iPad Detection (Very specific for iPadOS which disguises as Mac)
    const isIPad = /iPad/.test(ua) || 
                   (platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                   (ua.includes('Macintosh') && 'ontouchend' in document);
                   
    if (isIPad) return "iPad";
    
    // 2. Other iOS
    if (/iPhone|iPod/.test(ua)) return "iPhone";
    
    // 3. Android
    if (/android/i.test(ua)) return "Android";
    
    // 4. Desktop Platforms
    if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || /Mac/.test(platform)) return "Mac";
    if (/Win32|Win64|Windows|WinCE/.test(ua) || /Win/.test(platform)) return "Windows";
    
    // 5. Fallbacks
    if (/Linux/.test(platform) || /Linux/.test(ua)) return "Linux";
    if (/Mobi|Android/i.test(ua)) return "Mobile";
    
    return "Ordinateur";
};
