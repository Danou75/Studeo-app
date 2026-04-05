import { Tutor } from '../types';

export const getLanguageCode = (tutor: Tutor | null | undefined): string => {
    if (!tutor) return 'fr-FR';
    if (tutor.language) {
        const langMap: Record<string, string> = {
            fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT',
            de: 'de-DE', pt: 'pt-PT', ru: 'ru-RU', tr: 'tr-TR', pl: 'pl-PL',
            zh: 'zh-CN', ja: 'ja-JP', ar: 'ar-SA', ko: 'ko-KR', nl: 'nl-NL',
            el: 'el-GR', hi: 'hi-IN'
        };
        return langMap[tutor.language.toLowerCase()] || tutor.language;
    }

    const text = (tutor.name + ' ' + (tutor.description || '') + ' ' + (tutor.systemPrompt || '') + ' ' + (tutor.subject || '')).toLowerCase();
    
    if (text.includes('english') || text.includes('anglais')) return 'en-US';
    if (text.includes('italian') || text.includes('italien') || text.includes('italiano')) return 'it-IT';
    if (text.includes('spanish') || text.includes('espagnol') || text.includes('español')) return 'es-ES';
    if (text.includes('português') || text.includes('portugais') || text.includes('portuguese')) return 'pt-PT';
    if (text.includes('german') || text.includes('allemand') || text.includes('deutsch')) return 'de-DE';
    if (text.includes('turkish') || text.includes('turc') || text.includes('türkçe') || text.includes('mustafa') || text.includes('ataturk') || text.includes('atatürk') || text.includes('attaturk') || text.includes('attatürk')) return 'tr-TR';
    if (text.includes('chinese') || text.includes('chinois') || text.includes('中文') || text.includes('mandarin')) return 'zh-CN';
    if (text.includes('japanese') || text.includes('japonais') || text.includes('日本語')) return 'ja-JP';
    if (text.includes('korean') || text.includes('coréen') || text.includes('한국어')) return 'ko-KR';
    if (text.includes('arabic') || text.includes('arabe') || text.includes('العربية')) return 'ar-SA';
    if (text.includes('russian') || text.includes('russe') || text.includes('русский')) return 'ru-RU';
    if (text.includes('dutch') || text.includes('néerlandais') || text.includes('nederlands')) return 'nl-NL';
    if (text.includes('polish') || text.includes('polonais') || text.includes('polski')) return 'pl-PL';
    if (text.includes('greek') || text.includes('grec') || text.includes('ελληνικά')) return 'el-GR';
    if (text.includes('hindi') || text.includes('हिन्दी')) return 'hi-IN';
    
    return 'fr-FR'; // Default
};
