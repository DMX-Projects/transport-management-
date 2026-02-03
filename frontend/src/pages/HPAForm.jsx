import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import {
    useCreateHPAMutation,
    useUpdateHPAMutation,
    useGetHPAByIdQuery
} from '../features/hpa/hpaApi';
import { useGetLRsWithoutHPAQuery, useGetLRByIdQuery } from '../features/lr/lrApi';
import {
    useGetBranchesQuery,
    useGetTrucksQuery
} from '../features/masters/mastersApi';
import {
    ArrowLeftIcon,
    CheckIcon,
    TruckIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';

export default function HPAForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const { isSuperAdmin, user } = useAuth();

    // Form state (needs to be defined before queries that depend on it)
    const [formData, setFormData] = useState({
        branch: isSuperAdmin ? '' : String(user?.branch?.id || ''),
        truck: '',
        lr: '', // Primary LR
        hpa_date: new Date().toISOString().split('T')[0],
        from_location: '',
        to_location: '',
        owner_name: '',
        owner_mob: '',
        driver_name: '',
        driver_mob: '',
        tons: '',
        rate_per_tonne: '',
        lorry_hire_rs: '',
        // Payment Breakdown (matching physical HPA form)
        advance_paid_rs: '', // Less Advance
        diesel_amount: '',   // Diesel payment
        pump_name: '',       // Diesel pump name
        bank_amount: '',     // Bank transfer amount
        bank_name: '',       // Bank name
        other_deductions: '',// Other deductions
        other_deductions_description: '',
        total_deductions: '',
        balance_rs: '',
        payment_status: 'PENDING',
        note: '',
        remarks: ''
    });

    // API Queries
    const { data: hpaData, isLoading: isLoadingHPA } = useGetHPAByIdQuery(id, { skip: !id });
    const { data: branchesData } = useGetBranchesQuery();
    const { data: trucksData } = useGetTrucksQuery();
    
    // Get only LRs that don't have HPA created yet
    // For SuperAdmin: filter by selected branch (if any)
    // For Branch Manager: automatically filtered by their branch on backend
    // When editing: Also need to include the current LR (even though it has HPA, it's the same HPA)
    const branchFilter = isSuperAdmin && formData.branch 
        ? { branch: formData.branch } 
        : {};
    const { data: lrsData, refetch: refetchLRs } = useGetLRsWithoutHPAQuery(branchFilter, {
        skip: isSuperAdmin && !formData.branch  // Skip if SuperAdmin hasn't selected branch yet
    });
    
    // When editing, get the current LR to include it in the list
    const currentLRId = isEditMode && hpaData?.lr ? hpaData.lr : null;
    const { data: currentLRData } = useGetLRByIdQuery(currentLRId, { 
        skip: !currentLRId 
    });

    const [createHPA, { isLoading: isCreating }] = useCreateHPAMutation();
    const [updateHPA, { isLoading: isUpdating }] = useUpdateHPAMutation();

    // Extract arrays
    const branches = branchesData?.results || branchesData || [];
    const trucks = trucksData?.results || trucksData || [];
    
    // Combine LRs: without_hpa list + current LR (if editing)
    let lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || lrsData || []);
    
    // When editing, include the current LR even though it has HPA (it's the same HPA)
    if (isEditMode && currentLRData && !lrs.find(lr => lr.id === currentLRData.id)) {
        lrs = [currentLRData, ...lrs];
    }

    const [additionalLRs, setAdditionalLRs] = useState([]);
    const [invoices, setInvoices] = useState([]);

    // Load HPA data when editing
    useEffect(() => {
        if (isEditMode && hpaData) {
            setFormData({
                branch: hpaData.branch || '',
                truck: hpaData.truck || '',
                lr: hpaData.lr || '',
                hpa_date: hpaData.hpa_date || '',
                from_location: hpaData.from_location || '',
                to_location: hpaData.to_location || '',
                owner_name: hpaData.owner_name || '',
                owner_mob: hpaData.owner_mob || '',
                driver_name: hpaData.driver_name || '',
                driver_mob: hpaData.driver_mob || '',
                tons: hpaData.tons || '',
                rate_per_tonne: hpaData.rate_per_tonne || '',
                lorry_hire_rs: hpaData.lorry_hire_rs || '',
                // Payment Breakdown
                advance_paid_rs: hpaData.advance_paid_rs || '',
                diesel_amount: hpaData.diesel_amount || '',
                pump_name: hpaData.pump_name || '',
                bank_amount: hpaData.bank_amount || '',
                bank_name: hpaData.bank_name || '',
                other_deductions: hpaData.other_deductions || '',
                other_deductions_description: hpaData.other_deductions_description || '',
                total_deductions: hpaData.total_deductions || '',
                balance_rs: hpaData.balance_rs || '',
                payment_status: hpaData.payment_status || 'PENDING',
                note: hpaData.note || '',
                remarks: hpaData.remarks || ''
            });
            setAdditionalLRs(hpaData.additional_lrs?.map(lr => lr.id) || []);
            
            // Load invoices if available
            if (hpaData.invoices && hpaData.invoices.length > 0) {
                setInvoices(hpaData.invoices.map(inv => ({
                    invoice_number: inv.invoice_number || '',
                    invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0],
                    lr_ids: inv.lrs?.map(lr => lr.id) || inv.lr_ids || [],
                    from_location: inv.from_location || '',
                    to_location: inv.to_location || '',
                    destination: inv.destination || '',
                    quantity_mt: inv.quantity_mt || '',
                    number_of_bags: inv.number_of_bags || '',
                    material_description: inv.material_description || '',
                    amount: inv.amount || '',
                    remarks: inv.remarks || ''
                })));
            }
        }
    }, [isEditMode, hpaData]);

    // Auto-calculate Lorry Hire from Tons × Rate per Tonne
    useEffect(() => {
        const tons = parseFloat(formData.tons) || 0;
        const rate = parseFloat(formData.rate_per_tonne) || 0;

        if (tons > 0 && rate > 0) {
            const lorryHire = tons * rate;
            setFormData(prev => ({
                ...prev,
                lorry_hire_rs: lorryHire.toFixed(2)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                lorry_hire_rs: '0.00'
            }));
        }
    }, [formData.tons, formData.rate_per_tonne]);

    // Auto-calculate balance (Lorry Hire - All Deductions)
    useEffect(() => {
        const hire = parseFloat(formData.lorry_hire_rs) || 0;
        const advance = parseFloat(formData.advance_paid_rs) || 0;
        const diesel = parseFloat(formData.diesel_amount) || 0;
        const bank = parseFloat(formData.bank_amount) || 0;
        const other = parseFloat(formData.other_deductions) || 0;
        
        const totalDeductions = advance + diesel + bank + other;
        const balance = hire - totalDeductions;
        
        setFormData(prev => ({
            ...prev,
            total_deductions: totalDeductions.toFixed(2),
            balance_rs: balance.toFixed(2)
        }));
    }, [formData.lorry_hire_rs, formData.advance_paid_rs, formData.diesel_amount, formData.bank_amount, formData.other_deductions]);

    // Track previous truck value to detect changes
    const [previousTruck, setPreviousTruck] = useState(null);

    // Auto-populate owner and driver details when truck is selected/changed
    useEffect(() => {
        if (formData.truck && trucks.length > 0) {
            const selectedTruck = trucks.find(t => t.id === parseInt(formData.truck));
            if (selectedTruck && formData.truck !== previousTruck) {
                // Truck has changed - auto-populate owner and driver fields
                setFormData(prev => ({
                    ...prev,
                    owner_name: selectedTruck.owner_name || prev.owner_name || '',
                    owner_mob: selectedTruck.owner_phone || prev.owner_mob || '',
                    driver_name: selectedTruck.driver_name || prev.driver_name || '',
                    driver_mob: selectedTruck.driver_phone || prev.driver_mob || ''
                }));
                setPreviousTruck(formData.truck);
            }
        }
    }, [formData.truck, trucks, previousTruck]);

    // Auto-populate location from primary LR when LR is selected
    const [previousLR, setPreviousLR] = useState(null);
    
    useEffect(() => {
        if (formData.lr && lrs.length > 0 && formData.lr !== previousLR) {
            const selectedLR = lrs.find(lr => lr.id === parseInt(formData.lr));
            if (selectedLR) {
                setFormData(prev => ({
                    ...prev,
                    from_location: selectedLR.from_location || prev.from_location || '',
                    to_location: selectedLR.to_location || prev.to_location || ''
                }));
                setPreviousLR(formData.lr);
            }
        }
    }, [formData.lr, lrs, previousLR]);

    // Helper function to create invoice from LR
    const createInvoiceFromLR = (lrId) => {
        const lr = lrs.find(l => l.id === parseInt(lrId));
        if (!lr) return null;
        
        return {
            invoice_number: '',
            invoice_date: new Date().toISOString().split('T')[0],
            lr_ids: [lr.id],
            from_location: lr.from_location || '',
            to_location: lr.to_location || '',
            destination: lr.destination || lr.to_location || '',
            quantity_mt: lr.quantity_mt || lr.total_quantity_mt || '',
            number_of_bags: lr.number_of_bags || '',
            material_description: lr.material_description || '',
            amount: '',
            remarks: ''
        };
    };

    // Calculate total tons from all LRs (primary + additional)
    useEffect(() => {
        let totalTons = 0;
        
        // Add primary LR tons
        if (formData.lr && lrs.length > 0) {
            const primaryLR = lrs.find(lr => lr.id === parseInt(formData.lr));
            if (primaryLR) {
                totalTons += parseFloat(primaryLR.quantity_mt || primaryLR.total_quantity_mt || 0);
            }
        }
        
        // Add additional LRs tons
        additionalLRs.forEach(lrId => {
            if (lrId) {
                const lr = lrs.find(l => l.id === parseInt(lrId));
                if (lr) {
                    totalTons += parseFloat(lr.quantity_mt || lr.total_quantity_mt || 0);
                }
            }
        });
        
        // Update tons if calculated value is different
        if (totalTons > 0) {
            setFormData(prev => ({
                ...prev,
                tons: totalTons.toFixed(2)
            }));
        }
    }, [formData.lr, additionalLRs, lrs]);

    // Auto-populate driver and location from selected LR, and auto-create invoice
    useEffect(() => {
        if (formData.lr && lrs.length > 0) {
            const selectedLR = lrs.find(lr => lr.id === parseInt(formData.lr));
            if (selectedLR) {
                // Update form data (from/to location from primary LR)
                setFormData(prev => ({
                    ...prev,
                    from_location: selectedLR.from_location || prev.from_location,
                    to_location: selectedLR.to_location || prev.to_location
                }));
                
                // Auto-create invoice for primary LR if it doesn't exist
                setInvoices(prev => {
                    const hasPrimaryLRInvoice = prev.some(inv => inv.lr_ids.includes(selectedLR.id));
                    if (!hasPrimaryLRInvoice) {
                        const newInvoice = createInvoiceFromLR(selectedLR.id);
                        return newInvoice ? [newInvoice] : prev;
                    }
                    // Update existing invoice if LR details changed
                    return prev.map(inv => {
                        if (inv.lr_ids.includes(selectedLR.id)) {
                            return {
                                ...inv,
                                from_location: selectedLR.from_location || inv.from_location,
                                to_location: selectedLR.to_location || inv.to_location,
                                destination: selectedLR.destination || selectedLR.to_location || inv.destination,
                                quantity_mt: selectedLR.quantity_mt || selectedLR.total_quantity_mt || inv.quantity_mt
                            };
                        }
                        return inv;
                    });
                });
            }
        } else if (!formData.lr) {
            // If primary LR is removed, remove its invoice
            setInvoices(prev => prev.filter(inv => {
                // Keep invoices that have additional LRs or are not linked to primary LR
                const primaryLRId = formData.lr ? parseInt(formData.lr) : null;
                return !inv.lr_ids.includes(primaryLRId) || inv.lr_ids.length > 1;
            }));
        }
    }, [formData.lr, lrs]);

    // Auto-create invoice when additional LR is added
    useEffect(() => {
        const validAdditionalLRs = additionalLRs.filter(id => id);
        if (validAdditionalLRs.length > 0 && lrs.length > 0) {
            setInvoices(prev => {
                const newInvoices = [...prev];
                
                validAdditionalLRs.forEach(lrId => {
                    // Check if invoice already exists for this LR
                    const hasInvoice = newInvoices.some(inv => inv.lr_ids.includes(parseInt(lrId)));
                    if (!hasInvoice) {
                        const newInvoice = createInvoiceFromLR(lrId);
                        if (newInvoice) {
                            newInvoices.push(newInvoice);
                        }
                    }
                });
                
                // Remove invoices for LRs that are no longer in additionalLRs
                return newInvoices.filter(inv => {
                    // Keep primary LR invoice
                    const primaryLRId = formData.lr ? parseInt(formData.lr) : null;
                    if (inv.lr_ids.includes(primaryLRId) && inv.lr_ids.length === 1) {
                        return true;
                    }
                    // Keep if LR is still in additionalLRs
                    return inv.lr_ids.some(id => validAdditionalLRs.includes(String(id)));
                });
            });
        } else if (validAdditionalLRs.length === 0) {
            // Remove invoices for additional LRs if they're all removed
            setInvoices(prev => {
                const primaryLRId = formData.lr ? parseInt(formData.lr) : null;
                return prev.filter(inv => {
                    // Keep primary LR invoice
                    if (inv.lr_ids.includes(primaryLRId) && inv.lr_ids.length === 1) {
                        return true;
                    }
                    // Remove if no longer in additionalLRs
                    return inv.lr_ids.some(id => validAdditionalLRs.includes(String(id)));
                });
            });
        }
    }, [additionalLRs, lrs, formData.lr]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const loadingToast = toast.loading(isEditMode ? 'Updating HPA...' : 'Creating HPA...');
        
        try {
            // Auto-populate from_location and to_location from first invoice or primary LR
            let fromLocation = '';
            let toLocation = '';
            
            if (invoices.length > 0 && invoices[0].from_location) {
                fromLocation = invoices[0].from_location;
                toLocation = invoices[0].to_location || '';
            } else if (formData.lr && lrs.length > 0) {
                const primaryLR = lrs.find(lr => lr.id === parseInt(formData.lr));
                if (primaryLR) {
                    fromLocation = primaryLR.from_location || '';
                    toLocation = primaryLR.to_location || '';
                }
            }
            
            const submitData = {
                ...formData,
                from_location: fromLocation, // Auto-populated from invoice or LR
                to_location: toLocation, // Auto-populated from invoice or LR
                additional_lrs: additionalLRs.length > 0 ? additionalLRs : undefined,
                invoices: invoices.map(inv => ({
                    invoice_number: inv.invoice_number,
                    invoice_date: inv.invoice_date || undefined,
                    lr_ids: inv.lr_ids.length > 0 ? inv.lr_ids : undefined,
                    from_location: inv.from_location || undefined,
                    to_location: inv.to_location || undefined,
                    destination: inv.destination || undefined,
                    quantity_mt: inv.quantity_mt || undefined,
                    number_of_bags: inv.number_of_bags || undefined,
                    material_description: inv.material_description || undefined,
                    amount: inv.amount || undefined,
                    remarks: inv.remarks || undefined
                })).filter(inv => inv.invoice_number) // Only include invoices with invoice_number
            };

            if (isEditMode) {
                await updateHPA({ id, ...submitData }).unwrap();
                toast.success('HPA updated successfully!', { id: loadingToast });
            } else {
                await createHPA(submitData).unwrap();
                toast.success('HPA created successfully!', { id: loadingToast });
            }
            navigate('/hpa');
        } catch (error) {
            console.error('Error saving HPA:', error);
            
            let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} HPA`;
            
            if (error.data && typeof error.data === 'object') {
                const errors = Object.entries(error.data).map(([field, messages]) => {
                    const msgArray = Array.isArray(messages) ? messages : [messages];
                    return `${field}: ${msgArray.join(', ')}`;
                });
                errorMessage = errors.join('\n');
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage, { 
                id: loadingToast,
                duration: 5000,
                style: { maxWidth: '500px' }
            });
        }
    };

    const addAdditionalLR = () => {
        setAdditionalLRs([...additionalLRs, '']);
        // Invoice will be auto-created in useEffect when LR is selected
    };

    const removeAdditionalLR = (index) => {
        const lrIdToRemove = additionalLRs[index];
        setAdditionalLRs(additionalLRs.filter((_, i) => i !== index));
        // Remove invoice for this LR (handled in useEffect)
    };

    const updateAdditionalLR = (index, value) => {
        const updated = [...additionalLRs];
        updated[index] = value;
        setAdditionalLRs(updated);
    };

    // Invoice management functions
    // Note: Invoices are now auto-created when LRs are added
    // This function is kept for manual addition if needed
    const addInvoice = () => {
        setInvoices([...invoices, {
            invoice_number: '',
            invoice_date: new Date().toISOString().split('T')[0],
            lr_ids: [],
            from_location: '',
            to_location: '',
            destination: '',
            quantity_mt: '',
            number_of_bags: '',
            material_description: '',
            amount: '',
            remarks: ''
        }]);
    };

    const removeInvoice = (index) => {
        const invoiceToRemove = invoices[index];
        const lrIdsInInvoice = invoiceToRemove.lr_ids || [];
        
        // If this invoice is linked to primary LR, don't allow removal
        const primaryLRId = formData.lr ? parseInt(formData.lr) : null;
        if (lrIdsInInvoice.includes(primaryLRId)) {
            toast.error('Cannot remove invoice linked to Primary LR. Remove the LR instead.');
            return;
        }
        
        // If this invoice is linked to additional LR, remove that LR
        lrIdsInInvoice.forEach(lrId => {
            const lrIdStr = String(lrId);
            if (additionalLRs.includes(lrIdStr)) {
                setAdditionalLRs(additionalLRs.filter(id => id !== lrIdStr));
            }
        });
        
        // Remove the invoice
        setInvoices(invoices.filter((_, i) => i !== index));
    };

    const updateInvoice = (index, field, value) => {
        const updated = [...invoices];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-set destination from to_location if empty
        if (field === 'to_location' && !updated[index].destination) {
            updated[index].destination = value;
        }
        setInvoices(updated);
    };

    const updateInvoiceLRs = (index, lrId, checked) => {
        const updated = [...invoices];
        if (checked) {
            if (!updated[index].lr_ids.includes(lrId)) {
                updated[index].lr_ids = [...updated[index].lr_ids, lrId];
            }
        } else {
            updated[index].lr_ids = updated[index].lr_ids.filter(id => id !== lrId);
        }
        setInvoices(updated);
    };

    if (isEditMode && isLoadingHPA) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading HPA details...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/hpa')}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
                >
                    <ArrowLeftIcon style={{ width: '18px', height: '18px' }} />
                    Back to HPA List
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <TruckIcon style={{ width: '28px', height: '28px', color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                            {isEditMode ? 'Edit Hire Payment Advice' : 'Create New Hire Payment Advice'}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            {isEditMode ? `Editing HPA: ${hpaData?.hpa_number || id}` : 'Fill in the details below to create a new HPA'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="card" style={{ padding: '32px' }}>
                    {/* Section 1: Basic Information */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Basic Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Branch *</label>
                                <SearchableSelect
                                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    placeholder="Select Branch"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="form-label">HPA Date *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.hpa_date}
                                    onChange={(e) => setFormData({ ...formData, hpa_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Payment Status</label>
                                <select
                                    className="input"
                                    value={formData.payment_status}
                                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="PARTIAL">Partial</option>
                                    <option value="PAID">Paid</option>
                                    <option value="PENDING_BILL">Pending Bill</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Truck & LR */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Truck & Lorry Receipt
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Truck *</label>
                                <SearchableSelect
                                    options={trucks.map(t => ({ value: t.id, label: t.truck_number }))}
                                    value={formData.truck}
                                    onChange={(e) => setFormData({ ...formData, truck: e.target.value })}
                                    placeholder="Select Truck"
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Primary LR *</label>
                                <SearchableSelect
                                    options={lrs.map(lr => ({ 
                                        value: lr.id, 
                                        label: `${lr.lr_number} - ${lr.from_location} → ${lr.to_location}` 
                                    }))}
                                    value={formData.lr}
                                    onChange={(e) => setFormData({ ...formData, lr: e.target.value })}
                                    placeholder="Select Primary LR"
                                    required
                                />
                            </div>
                        </div>

                        {/* Additional LRs */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Additional LRs (Optional)</label>
                                <button
                                    type="button"
                                    onClick={addAdditionalLR}
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <PlusIcon style={{ width: '16px', height: '16px' }} />
                                    Add LR
                                </button>
                            </div>
                            {additionalLRs.map((lrId, index) => (
                                <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={lrs.map(lr => ({ 
                                                value: lr.id, 
                                                label: `${lr.lr_number} - ${lr.from_location} → ${lr.to_location}` 
                                            }))}
                                            value={lrId}
                                            onChange={(e) => updateAdditionalLR(index, e.target.value)}
                                            placeholder="Select Additional LR"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAdditionalLR(index)}
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px' }}
                                    >
                                        <TrashIcon style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Location Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Route Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">From Location *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.from_location}
                                    onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                                    placeholder="e.g., Chettinad Dachepalli"
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">To Location *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.to_location}
                                    onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                                    placeholder="e.g., Proddatur"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Owner & Driver Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Owner & Driver Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Owner Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.owner_name}
                                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                                    placeholder="Truck owner name"
                                />
                            </div>
                            <div>
                                <label className="form-label">Owner Mobile</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData.owner_mob}
                                    onChange={(e) => setFormData({ ...formData, owner_mob: e.target.value })}
                                    placeholder="Owner mobile"
                                />
                            </div>
                            <div>
                                <label className="form-label">Driver Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.driver_name}
                                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                    placeholder="Driver name"
                                />
                            </div>
                            <div>
                                <label className="form-label">Driver Mobile</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData.driver_mob}
                                    onChange={(e) => setFormData({ ...formData, driver_mob: e.target.value })}
                                    placeholder="Driver mobile"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Payment Details - Matching Physical HPA Form */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Payment Details
                        </h3>

                        {/* Payment Breakdown - Matching Physical HPA Form */}
                        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#92400e' }}>
                                Payment Breakdown (Deductions from Lorry Hire)
                            </h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label className="form-label">Less Advance (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.advance_paid_rs}
                                        onChange={(e) => setFormData({ ...formData, advance_paid_rs: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Diesel (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.diesel_amount}
                                        onChange={(e) => setFormData({ ...formData, diesel_amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Pump Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.pump_name}
                                        onChange={(e) => setFormData({ ...formData, pump_name: e.target.value })}
                                        placeholder="Diesel pump name"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Bank (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.bank_amount}
                                        onChange={(e) => setFormData({ ...formData, bank_amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Bank Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                        placeholder="Bank name"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Other Deductions (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={formData.other_deductions}
                                        onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {formData.other_deductions > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <label className="form-label">Other Deductions Description</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.other_deductions_description}
                                        onChange={(e) => setFormData({ ...formData, other_deductions_description: e.target.value })}
                                        placeholder="Description of other deductions"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Total and Balance */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Total Deductions (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={formData.total_deductions}
                                    readOnly
                                    style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}
                                />
                            </div>

                            <div>
                                <label className="form-label">Balance Rs. (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={formData.balance_rs}
                                    readOnly
                                    style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '18px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Invoices */}
                    <div style={{ marginBottom: '32px' }}>
                        {invoices.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                                Invoices will be automatically created when you select LRs above
                            </p>
                        )}

                        {invoices.map((invoice, index) => (
                            <div key={index} style={{ 
                                marginBottom: '24px', 
                                padding: '20px', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px',
                                background: '#f9fafb'
                            }}>
                                {invoices.length > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                                        <button
                                            type="button"
                                            onClick={() => removeInvoice(index)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <TrashIcon style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                    <div>
                                        <label className="form-label">Invoice Number *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={invoice.invoice_number}
                                            onChange={(e) => updateInvoice(index, 'invoice_number', e.target.value)}
                                            placeholder="e.g., 20153572"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Invoice Date</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={invoice.invoice_date}
                                            onChange={(e) => updateInvoice(index, 'invoice_date', e.target.value)}
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Linked LR</label>
                                        <div style={{ 
                                            padding: '12px',
                                            background: '#f0f9ff',
                                            border: '1px solid #bae6fd',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            color: '#0c4a6e'
                                        }}>
                                            {invoice.lr_ids && invoice.lr_ids.length > 0 ? (
                                                invoice.lr_ids.map(lrId => {
                                                    const lr = lrs.find(l => l.id === lrId);
                                                    return lr ? (
                                                        <div key={lrId} style={{ marginBottom: '4px' }}>
                                                            <strong>{lr.lr_number}</strong> - {lr.from_location} → {lr.to_location}
                                                            {lr.quantity_mt && ` (${lr.quantity_mt} MT)`}
                                                        </div>
                                                    ) : `LR-${lrId}`;
                                                })
                                            ) : (
                                                <span style={{ color: '#6b7280' }}>No LR linked</span>
                                            )}
                                        </div>
                                        <small style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                                            This invoice is automatically linked to the LR selected above. Remove the LR to remove this invoice.
                                        </small>
                                    </div>

                                    <div>
                                        <label className="form-label">From Location</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={invoice.from_location}
                                            onChange={(e) => updateInvoice(index, 'from_location', e.target.value)}
                                            placeholder="Pickup location"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">To Location</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={invoice.to_location}
                                            onChange={(e) => updateInvoice(index, 'to_location', e.target.value)}
                                            placeholder="Delivery location"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Destination</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={invoice.destination}
                                            onChange={(e) => updateInvoice(index, 'destination', e.target.value)}
                                            placeholder="Final destination"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Quantity (MT)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input"
                                            value={invoice.quantity_mt}
                                            onChange={(e) => updateInvoice(index, 'quantity_mt', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Number of Bags</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="input"
                                            value={invoice.number_of_bags}
                                            onChange={(e) => updateInvoice(index, 'number_of_bags', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Amount (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input"
                                            value={invoice.amount}
                                            onChange={(e) => updateInvoice(index, 'amount', e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Material Description</label>
                                        <textarea
                                            className="input"
                                            rows={2}
                                            value={invoice.material_description}
                                            onChange={(e) => updateInvoice(index, 'material_description', e.target.value)}
                                            placeholder="Material description for this invoice"
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Remarks</label>
                                        <textarea
                                            className="input"
                                            rows={2}
                                            value={invoice.remarks}
                                            onChange={(e) => updateInvoice(index, 'remarks', e.target.value)}
                                            placeholder="Invoice-specific remarks"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section 6: Location & Cargo Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Location & Cargo Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Tons (Quantity) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={formData.tons}
                                    onChange={(e) => setFormData({ ...formData, tons: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Rate per Tonne (₹) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={formData.rate_per_tonne}
                                    onChange={(e) => setFormData({ ...formData, rate_per_tonne: e.target.value })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                        
                        {/* Lorry Hire Calculation Display - Shows Auto-calculated value */}
                        <div style={{ marginTop: '20px', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                            <label className="form-label" style={{ color: '#0369a1', fontWeight: 600 }}>Lorry Hire (₹) - Auto-calculated</label>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0c4a6e', marginTop: '8px' }}>
                                ₹{formData.lorry_hire_rs || '0.00'}
                            </div>
                            <small style={{ color: '#0369a1', fontSize: '13px', marginTop: '6px', display: 'block' }}>
                                Calculation: {formData.tons || '0'} tons × ₹{formData.rate_per_tonne || '0'} per tonne = ₹{formData.lorry_hire_rs || '0.00'}
                            </small>
                        </div>
                    </div>

                    {/* Section 7: Remarks */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Additional Information
                        </h3>
                        <div>
                            <label className="form-label">Remarks</label>
                            <textarea
                                className="input"
                                rows={3}
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                placeholder="Any additional notes or remarks..."
                            />
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                        paddingTop: '24px',
                        borderTop: '1px solid #e5e7eb'
                    }}>
                        <button
                            type="button"
                            onClick={() => navigate('/hpa')}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isCreating || isUpdating}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <CheckIcon style={{ width: '18px', height: '18px' }} />
                            {isEditMode ? 'Update HPA' : 'Create HPA'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

