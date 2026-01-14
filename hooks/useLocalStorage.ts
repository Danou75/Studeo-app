import { useState, useEffect } from 'react';

// Validation schema type
type ValidationSchema<T> = (value: unknown) => value is T;

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validator?: ValidationSchema<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);

      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item);

      // Optional validation
      if (validator && !validator(parsed)) {
        console.warn(
          `Invalid data in localStorage for key "${key}", using initial value`
        );
        return initialValue;
      }

      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      // Check size before saving
      const serialized = JSON.stringify(storedValue);

      // 5MB limit to avoid saturating localStorage
      if (serialized.length > 5 * 1024 * 1024) {
        console.error(`Data too large for localStorage key "${key}"`);
        return;
      }

      window.localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded');
        // Optional: clean up old data (implemented in specific cleanup functions if needed)
      } else {
        console.error(`Error writing to localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
