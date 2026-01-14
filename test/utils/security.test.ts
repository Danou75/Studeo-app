import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeFileName } from '../../utils/security';

describe('Security Utils', () => {
    describe('sanitizeHtml', () => {
        it('should remove script tags', () => {
            const input = '<p>Hello</p><script>alert("xss")</script>';
            const result = sanitizeHtml(input);
            expect(result).not.toContain('<script>');
            // After sanitization, dangerous content should be escaped or removed
            expect(result.toLowerCase()).not.toMatch(/<script[\s>]/);
        });

        it('should remove event handlers', () => {
            const input = '<div onclick="alert(1)">Click me</div>';
            const result = sanitizeHtml(input);
            // Event handlers should be removed or escaped
            expect(result.toLowerCase()).not.toMatch(/onclick\s*=/);
        });

        it('should allow safe HTML', () => {
            const input = '<p>Hello <strong>world</strong></p>';
            const result = sanitizeHtml(input);
            expect(result).toContain('Hello');
            expect(result).toContain('world');
        });

        it('should handle empty strings', () => {
            expect(sanitizeHtml('')).toBe('');
        });
    });

    describe('sanitizeFileName', () => {
        it('should remove dangerous characters', () => {
            const input = '../../../etc/passwd';
            const result = sanitizeFileName(input);
            expect(result).toBe('etcpasswd'); // All dots and slashes removed
        });

        it('should remove null bytes', () => {
            const input = 'file\0name.txt';
            const result = sanitizeFileName(input);
            expect(result).not.toContain('\0');
        });

        it('should preserve safe filenames', () => {
            const input = 'my-file_2024.txt';
            const result = sanitizeFileName(input);
            expect(result).toBe(input);
        });

        it('should handle empty strings', () => {
            expect(sanitizeFileName('')).toBe('');
        });

        it('should remove control characters', () => {
            const input = 'file\nname\r.txt';
            const result = sanitizeFileName(input);
            expect(result).not.toContain('\n');
            expect(result).not.toContain('\r');
        });
    });
});
