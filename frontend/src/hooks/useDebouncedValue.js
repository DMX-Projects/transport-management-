import { useEffect, useState } from 'react';

// Returns a debounced copy of the provided value
export function useDebouncedValue(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handle);
    }, [value, delay]);

    return debouncedValue;
}
