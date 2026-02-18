import { useState, useEffect } from "react";

const useLocalPersistState = (defaultValue, key) => {
  const [value, setValue] = useState(() => {
    try {
      const persistValue = window.localStorage.getItem(key);

      if (persistValue === null) return defaultValue;

      return JSON.parse(persistValue);
    } catch (error) {
      console.error(`Invalid JSON in localStorage for key: ${key}`);
      window.localStorage.removeItem(key);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to write to localStorage:", error);
    }
  }, [key, value]);

  return [value, setValue];
};

export default useLocalPersistState;
