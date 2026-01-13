import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * SearchableSelect Component
 * A searchable dropdown with debouncing and backend search
 * 
 * @param {Object} props
 * @param {Array} props.options - Initial options array
 * @param {Function} props.onSearch - Function to call for backend search (returns Promise)
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label for the select
 * {boolean} props.required - Is field required
 * @param {Function} props.getOptionLabel - Function to get display label from option
 * @param {Function} props.getOptionValue - Function to get value from option
 * @param {number} props.debounceMs - Debounce delay in milliseconds (default: 300)
 */
export default function SearchableSelect({
    options: initialOptions = [],
    onSearch,
    value,
    onChange,
    placeholder = 'Search and select...',
    label,
    name,
    required = false,
    getOptionLabel = (option) => option.name || option.truck_number || option.lr_number || String(option),
    getOptionValue = (option) => option.id || option.value || String(option),
    debounceMs = 300,
    disabled = false,
    error = null,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState(initialOptions);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    
    const searchTimeoutRef = useRef(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Debounced search function
    const performSearch = useCallback(async (term) => {
        if (!onSearch || !term || term.length < 2) {
            // If search term is too short, use initial options
            setOptions(initialOptions);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // onSearch should be a function that returns a promise with search results
            const results = await onSearch(term);
            
            // Handle different response formats
            let resultsArray = [];
            if (Array.isArray(results)) {
                resultsArray = results;
            } else if (results?.results) {
                resultsArray = results.results;
            } else if (results?.data?.results) {
                resultsArray = results.data.results;
            } else if (results?.data) {
                resultsArray = Array.isArray(results.data) ? results.data : [];
            }
            
            // Only update if we got results, otherwise keep showing initial options
            if (resultsArray.length > 0) {
                // Ensure selected value is in the options if it exists
                let finalOptions = resultsArray;
                if (value) {
                    const hasSelected = resultsArray.some(opt => {
                        const optValue = getOptionValue(opt);
                        return String(optValue) === String(value) || optValue === value;
                    });
                    if (!hasSelected) {
                        // Find selected option in initialOptions and add it
                        const selectedInInitial = initialOptions.find(opt => {
                            const optValue = getOptionValue(opt);
                            return String(optValue) === String(value) || optValue === value;
                        });
                        if (selectedInInitial) {
                            finalOptions = [selectedInInitial, ...resultsArray];
                        }
                    }
                }
                setOptions(finalOptions);
            } else {
                // If no search results, still show initial options filtered by search term
                const filtered = initialOptions.filter(opt => {
                    const label = getOptionLabel(opt).toLowerCase();
                    return label.includes(term.toLowerCase());
                });
                setOptions(filtered.length > 0 ? filtered : initialOptions);
            }
        } catch (error) {
            console.error('Search error:', error);
            // On error, filter initial options by search term
            const filtered = initialOptions.filter(opt => {
                const label = getOptionLabel(opt).toLowerCase();
                return label.includes(term.toLowerCase());
            });
            setOptions(filtered.length > 0 ? filtered : initialOptions);
        } finally {
            setIsLoading(false);
        }
    }, [onSearch, initialOptions, getOptionLabel, getOptionValue, value]);

    // Debounce search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchTerm) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchTerm);
            }, debounceMs);
        } else {
            // If search is cleared, show initial options
            setOptions(initialOptions);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm, performSearch, debounceMs, initialOptions]);

    // Update options when initialOptions change
    useEffect(() => {
        if (!searchTerm) {
            setOptions(initialOptions);
        }
    }, [initialOptions, searchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get selected option - handle both string and number comparisons
    // First check in current options, then check in initialOptions if not found
    const selectedOption = options.find(opt => {
        const optValue = getOptionValue(opt);
        return String(optValue) === String(value) || optValue === value;
    }) || initialOptions.find(opt => {
        const optValue = getOptionValue(opt);
        return String(optValue) === String(value) || optValue === value;
    });

    // Handle selection
    const handleSelect = (option) => {
        const optionValue = getOptionValue(option);
        
        // Create a proper event object that matches standard input onChange
        const syntheticEvent = {
            target: {
                name: name,
                value: String(optionValue), // Convert to string to match form expectations
            },
            currentTarget: {
                name: name,
                value: String(optionValue),
            },
            preventDefault: () => {},
            stopPropagation: () => {},
        };
        
        onChange(syntheticEvent);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                inputRef.current?.focus();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < options.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                    handleSelect(options[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    };

    // Clear selection
    const handleClear = (e) => {
        e.stopPropagation();
        onChange({ target: { value: '' } });
        setSearchTerm('');
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {label && (
                <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    marginBottom: '8px', 
                    color: '#374151' 
                }}>
                    {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
            )}
            
            <div
                style={{
                    position: 'relative',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {/* Selected value display / Search input */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: disabled ? '#f3f4f6' : 'white',
                        border: error ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
                        borderRadius: '8px',
                        minHeight: '44px',
                        cursor: disabled ? 'not-allowed' : 'text',
                        transition: 'all 0.2s'
                    }}
                    onKeyDown={handleKeyDown}
                    tabIndex={disabled ? -1 : 0}
                >
                    {isOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                            <MagnifyingGlassIcon style={{ width: '18px', height: '18px', color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(-1);
                                }}
                                onFocus={() => setIsOpen(true)}
                                placeholder={placeholder}
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '14px',
                                    background: 'transparent',
                                    color: '#111827'
                                }}
                                autoFocus
                            />
                            {isLoading && (
                                <div style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    border: '2px solid #e5e7eb',
                                    borderTopColor: '#6366f1',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite',
                                    flexShrink: 0
                                }} />
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ 
                                fontSize: '14px', 
                                color: selectedOption ? '#111827' : '#9ca3af',
                                flex: 1,
                                textAlign: 'left'
                            }}>
                                {selectedOption ? getOptionLabel(selectedOption) : placeholder}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {value && !disabled && (
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        style={{
                                            padding: '4px',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#9ca3af',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <XMarkIcon style={{ width: '16px', height: '16px' }} />
                                    </button>
                                )}
                                <ChevronDownIcon style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    color: '#9ca3af',
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}
                >
                    {options.length === 0 && !isLoading ? (
                        <div style={{ 
                            padding: '16px', 
                            textAlign: 'center', 
                            color: '#9ca3af',
                            fontSize: '14px'
                        }}>
                            {searchTerm ? 'No results found' : 'No options available'}
                        </div>
                    ) : (
                        options.map((option, index) => {
                            const optionValue = getOptionValue(option);
                            const optionLabel = getOptionLabel(option);
                            // Handle both string and number comparisons
                            const isSelected = String(optionValue) === String(value) || optionValue === value;
                            const isHighlighted = index === highlightedIndex;

                            return (
                                <div
                                    key={optionValue}
                                    onClick={() => handleSelect(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        background: isSelected 
                                            ? '#eff6ff' 
                                            : isHighlighted 
                                                ? '#f9fafb' 
                                                : 'white',
                                        color: isSelected ? '#2563eb' : '#111827',
                                        fontSize: '14px',
                                        borderBottom: index < options.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        fontWeight: isSelected ? 600 : 400,
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {optionLabel}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {error && (
                <p style={{ 
                    fontSize: '12px', 
                    color: '#ef4444', 
                    marginTop: '4px' 
                }}>
                    {error}
                </p>
            )}
        </div>
    );
}

