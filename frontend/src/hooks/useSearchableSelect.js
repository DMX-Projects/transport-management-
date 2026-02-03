import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';

/**
 * Hook for creating search functions for SearchableSelect component
 * Uses RTK Query search endpoints with proper authentication
 */
export function useSearchableSelect(searchEndpoint, defaultParams = {}) {
    const token = useSelector(selectToken);
    const [searchTerm, setSearchTerm] = useState('');

    const searchFunction = useCallback(async (term) => {
        if (!term || term.length < 2) {
            return [];
        }

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
            const baseUrl = apiBase.replace('/api/v1', '');
            const url = new URL(`${baseUrl}/api/v1${searchEndpoint.startsWith('/') ? '' : '/'}${searchEndpoint}`, window.location.origin);
            url.searchParams.set('search', term);
            Object.entries(defaultParams || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, value);
                }
            });

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            return Array.isArray(data) ? data : (data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }, [searchEndpoint, token, defaultParams]);

    return {
        searchTerm,
        setSearchTerm,
        searchFunction,
    };
}

