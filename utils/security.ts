export const sanitizeHtml = (str: string): string => {
  // Remove script tags and event handlers
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Use textContent for additional safety
  const div = document.createElement("div");
  div.textContent = sanitized;
  return div.innerHTML;
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts and dangerous characters
  let sanitized = fileName.replace(/\.\./g, ''); // Remove ..
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, ''); // Remove dangerous chars
  return sanitized.slice(0, 255);
};
