/**
 * Utility to export text/markdown content to RTF (Rich Text Format)
 * Especially useful for macOS users (Pages, TextEdit)
 */

export const escapeRTF = (str: string) => {
    if (!str) return '';
    // Escape special RTF characters
    let escaped = str.replace(/[\\{}]/g, (c) => `\\${c}`);
    // Escape Unicode characters for RTF (\uN?)
    return escaped.replace(/[^\x00-\x7F]/g, (c) => {
        const charCode = c.charCodeAt(0);
        return `\\u${charCode}?`;
    });
};

/**
 * Basic Markdown to RTF converter
 */
export const markdownToRTF = (markdown: string, title?: string): string => {
    let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1036{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Times New Roman;}}
{\\colortbl ;\\red233\\green30\\blue99;\\red63\\green81\\blue181;\\red103\\green58\\blue183;\\red102\\green102\\blue102;}
\\viewkind4\\uc1\\f0`;

    if (title) {
        rtf += `\\fs40\\b\\cf1 ${escapeRTF(title.toUpperCase())} \\b0\\cf0\\fs24 \\par\\par\n`;
    }

    const lines = markdown.split('\n');
    
    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) {
            rtf += '\\par\n';
            return;
        }

        // Headers
        if (trimmed.startsWith('# ')) {
            rtf += `\\fs36\\b\\cf2 ${escapeRTF(trimmed.substring(2))} \\cf0\\b0\\fs24 \\par\n`;
        } else if (trimmed.startsWith('## ')) {
            rtf += `\\fs32\\b\\cf3 ${escapeRTF(trimmed.substring(3))} \\cf0\\b0\\fs24 \\par\n`;
        } else if (trimmed.startsWith('### ')) {
            rtf += `\\fs28\\b ${escapeRTF(trimmed.substring(4))} \\b0\\fs24 \\par\n`;
        } 
        // Lists
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            rtf += `\\bullet  ${processInlines(trimmed.substring(2))} \\par\n`;
        }
        else if (/^\d+\. /.test(trimmed)) {
            rtf += `${escapeRTF(trimmed)} \\par\n`;
        }
        // Horizontal line
        else if (trimmed === '---' || trimmed === '***') {
            rtf += `\\par\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\\par\n`;
        }
        // Bold / Italics in paragraph
        else {
            rtf += `${processInlines(trimmed)} \\par\n`;
        }
    });

    rtf += `\\par\\fs18\\cf4 Genere par Studeo\\cf0\\fs24 }`;
    return rtf;
};

const processInlines = (text: string): string => {
    let processed = escapeRTF(text);
    
    // Bold: **text** -> \b text \b0
    // We need to be careful with escapeRTF already processed. 
    // Actually, it's better to find markers BEFORE escapeRTF or use markers that escapeRTF doesn't touch.
    // Let's do a simple replacement for bold.
    
    // Bold
    processed = processed.replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0 ');
    
    // Italics
    processed = processed.replace(/\*(.*?)\*/g, '\\i $1\\i0 ');
    
    return processed;
};
