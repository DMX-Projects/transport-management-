import { useState, useEffect } from 'react';
import { useGetLRsQuery, useCreateLRMutation, useUpdateLRMutation } from '../features/lr/lrApi';
import { useAuth } from '../hooks/useAuth';
import {
    useGetBranchesQuery,
    useGetTrucksQuery,
    useGetConsignorsQuery,
    useGetPartiesQuery,
    useCreateBranchMutation,
    useCreateTruckMutation,
    useCreateConsignorMutation,
    useCreatePartyMutation
} from '../features/masters/mastersApi';
import { DocumentTextIcon, XMarkIcon, PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PencilIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchableSelect } from '../hooks/useSearchableSelect';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export default function LRManagement() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLR, setSelectedLR] = useState(null);
    const [filters, setFilters] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: lrsData, isLoading: isLoadingLRs, error: lrsError } = useGetLRsQuery({ ...filters, search: debouncedSearch, page, page_size: pageSize });
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    const { data: trucksData, isLoading: isLoadingTrucks } = useGetTrucksQuery();
    const { data: consignorsData, isLoading: isLoadingConsignors } = useGetConsignorsQuery();
    const { data: partiesData, isLoading: isLoadingParties } = useGetPartiesQuery();

    const [createLR, { isLoading: isCreating }] = useCreateLRMutation();
    const [updateLR, { isLoading: isUpdating }] = useUpdateLRMutation();
    const { canEdit } = useAuth();

    // Extract arrays from API response - handle both array and paginated object formats
    const lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || []);
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);
    const trucks = Array.isArray(trucksData) ? trucksData : (trucksData?.results || []);
    const consignors = Array.isArray(consignorsData) ? consignorsData : (consignorsData?.results || []);
    const parties = Array.isArray(partiesData) ? partiesData : (partiesData?.results || []);

    const handleUpdateLR = async (formData) => {
        try {
            await updateLR({ id: selectedLR.id, ...formData }).unwrap();
            setShowEditModal(false);
            setSelectedLR(null);
            alert('✅ LR updated successfully!');
        } catch (error) {
            console.error('Error updating LR:', error);
            let errorMessage = 'Error updating LR:\n\n';
            if (error.data && typeof error.data === 'object' && !Array.isArray(error.data)) {
                Object.entries(error.data).forEach(([field, messages]) => {
                    const msgArray = Array.isArray(messages) ? messages : [messages];
                    errorMessage += `• ${field}: ${msgArray.join(', ')}\n`;
                });
            } else if (typeof error.data === 'string') {
                errorMessage += error.data;
            } else {
                errorMessage += error.message || 'Unknown error occurred';
            }
            alert(errorMessage);
        }
    };

    const handleCreateLR = async (formData) => {
        try {
            await createLR(formData).unwrap();
            setShowCreateModal(false);
            alert('✅ LR created successfully!');
        } catch (error) {
            console.error('Error creating LR:', error);
            let errorMessage = 'Error creating LR:\n\n';

            if (error.data) {
                // Check if error.data is an object with field-specific errors
                if (typeof error.data === 'object' && !Array.isArray(error.data)) {
                    Object.entries(error.data).forEach(([field, messages]) => {
                        const msgArray = Array.isArray(messages) ? messages : [messages];
                        errorMessage += `• ${field}: ${msgArray.join(', ')}\n`;
                    });
                } else if (typeof error.data === 'string') {
                    // If it's a string error message
                    errorMessage += error.data;
                } else {
                    // Fallback
                    errorMessage += JSON.stringify(error.data);
                }
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Unknown error occurred';
            }

            alert(errorMessage);
        }
    };


    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'DELIVERED':
                return 'badge-success';
            case 'AT_UNLOADING':
                return 'badge-info';
            case 'IN_TRANSIT':
                return 'badge-warning';
            case 'LOADING':
                return 'badge-info';
            case 'ISSUED':
                return 'badge-info';
            case 'DRAFT':
                return 'badge-secondary';
            case 'PENDING_HPA':
            case 'PENDING':
                return 'badge-error';
            case 'CANCELLED':
                return 'badge-error';
            default:
                return 'badge-secondary';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        <span className="gradient-text">LR Management</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Create and manage Lorry Receipts</p>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    Create New LR
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                            Search
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MagnifyingGlassIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }} />
                            <input
                                type="text"
                                className="input"
                                placeholder="LR Number, Invoice..."
                                style={{ paddingLeft: '40px' }}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                            Branch
                        </label>
                        <select
                            className="input"
                            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                        >
                            <option value="">All Branches</option>
                            {branches?.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                            Status
                        </label>
                        <select
                            className="input"
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING_HPA">Open (Pending HPA)</option>
                            <option value="ISSUED">Issued</option>
                            <option value="LOADING">Loading</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* LR List */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                    Lorry Receipts
                </h2>

                {isLoadingLRs ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        Loading...
                    </div>
                ) : lrsError ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                        <p style={{ marginBottom: '8px', fontWeight: 600 }}>Error loading LRs</p>
                        <p style={{ fontSize: '14px' }}>{lrsError?.data?.detail || lrsError?.message || 'Failed to load data'}</p>
                    </div>
                ) : !lrs || lrs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        No LRs found. Create your first LR!
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        {/* Pagination controls */}
                        {lrsData?.count !== undefined && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                <button className="btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={!lrsData?.previous}>Prev</button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {page}</span>
                                <button className="btn" onClick={() => setPage(page + 1)} disabled={!lrsData?.next}>Next</button>
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 25); setPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>Total: {lrsData?.count || lrs.length}</span>
                            </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Consignor</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Consignee</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Qty (MT)</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>From → To</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Quantity</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lrs.map((lr, index) => (
                                    <tr
                                        key={lr.id}
                                        style={{ borderBottom: index < lrs.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{lr.lr_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.lr_date ? new Date(lr.lr_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.consignor_name || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.consignee_name || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.truck_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.quantity_mt || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{lr.from_location} → {lr.to_location}</td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(lr.status)}`}>
                                                {lr.status || 'DRAFT'}
                                            </span>
                                            {canEdit && (
                                                <select
                                                    style={{ marginLeft: '8px', fontSize: '12px' }}
                                                    value={lr.status}
                                                    onChange={e => updateLR({ id: lr.id, status: e.target.value })}
                                                >
                                                    <option value="DRAFT">Draft</option>
                                                    <option value="PENDING_HPA">Pending HPA</option>
                                                    <option value="ISSUED">Issued</option>
                                                    <option value="LOADING">Loading</option>
                                                    <option value="IN_TRANSIT">In Transit</option>
                                                    <option value="AT_UNLOADING">At Unloading</option>
                                                    <option value="DELIVERED">Delivered</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                            {lr.grade || '-'}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        const token = localStorage.getItem('token');
                                                        const url = `http://localhost:8000/api/v1/lr/lorry-receipts/${lr.id}/download_pdf/`;
                                                        fetch(url, {
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`
                                                            }
                                                        })
                                                        .then(response => response.blob())
                                                        .then(blob => {
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `LR_${lr.lr_number}.pdf`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            window.URL.revokeObjectURL(url);
                                                            document.body.removeChild(a);
                                                        })
                                                        .catch(error => {
                                                            console.error('Error downloading PDF:', error);
                                                            alert('Error downloading PDF. Please try again.');
                                                        });
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                                    title="Download LR PDF"
                                                >
                                                    <ArrowDownTrayIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLR(lr);
                                                            setShowEditModal(true);
                                                        }}
                                                        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1' }}
                                                        title="Edit LR"
                                                    >
                                                        <PencilIcon style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create LR Modal */}
            {showCreateModal && (
                <CreateLRModal
                    branches={branches || []}
                    trucks={trucks || []}
                    consignors={consignors || []}
                    parties={parties || []}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateLR}
                    isLoading={isCreating}
                />
            )}

            {/* Edit LR Modal */}
            {showEditModal && selectedLR && (
                <EditLRModal
                    lr={selectedLR}
                    branches={branches || []}
                    trucks={trucks || []}
                    consignors={consignors || []}
                    parties={parties || []}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedLR(null);
                    }}
                    onSubmit={handleUpdateLR}
                    isLoading={isUpdating}
                />
            )}
        </div>
    );
}

function CreateLRModal({ branches, trucks, consignors, parties, onClose, onSubmit, isLoading }) {
    const { isSuperAdmin, user } = useAuth();
    
    // Search hooks for each select
    const branchSearch = useSearchableSelect('/masters/branches/');
    const truckSearch = useSearchableSelect('/masters/trucks/');
    const consignorSearch = useSearchableSelect('/masters/consignors/');
    const partySearch = useSearchableSelect('/masters/parties/');

    // Get branch ID for branch managers - convert to string to match API expectations
    const defaultBranchId = isSuperAdmin ? '' : String(user?.branch?.id || user?.branch || '');

    const [formData, setFormData] = useState({
        branch: defaultBranchId, // SuperAdmin must select branch, Branch Manager auto-assigned
        consignor: '',
        consignee: '',
        truck: '',
        lr_date: new Date().toISOString().split('T')[0], // Today's date
        sap_number: '',
        lr_submitted_time: '',
        from_location: '',
        to_location: '',
        destination: '',
        delivery_at: '',
        material_description: '',
        quantity_mt: '',
        number_of_bags: '',
        grade: '',
        grade_quantity: '',
        loading_from_department: 'DISTRIBUTION DEPARTMENT',
        please_load: '',
        number_of_loads: '',
        grade_type_of_pkg: '',
        driver_name: '',
        driver_phone: '',
        driver_license_no: '',
        payment_term: 'TO_BE_BILLED',
        gst_payable_by: 'SERVICE',
        status: 'DRAFT',
        expected_loading_date: '',
        actual_loading_date: '',
        expected_delivery_date: '',
        actual_delivery_date: '',
        remarks: '',
        note: '',
    });

    // No financial calculations in LR - amounts are only in HPA
    const [selectedTruck, setSelectedTruck] = useState(null);

    // Auto-populate driver details from truck when truck is selected
    const handleTruckChange = (e) => {
        const truckId = e.target.value;
        const truck = trucks.find(t => t.id === parseInt(truckId));
        setSelectedTruck(truck);
        setFormData({
            ...formData,
            truck: truckId,
            driver_name: truck?.driver_name || formData.driver_name,
            driver_phone: truck?.driver_phone || formData.driver_phone,
            driver_license_no: truck?.driver_license_no || formData.driver_license_no,
        });
    };

    // No financial calculations - LR doesn't contain amounts (only in HPA)

    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showTruckModal, setShowTruckModal] = useState(false);
    const [showConsignorModal, setShowConsignorModal] = useState(false);
    const [showPartyModal, setShowPartyModal] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updatedData = { ...formData, [name]: value };
        
        // No financial calculations - LR doesn't contain amounts (only in HPA)
        
        setFormData(updatedData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean up the form data - remove empty optional fields
        const cleanedData = { ...formData };

        // Branch managers: Remove branch field (backend auto-assigns from user.branch)
        // SuperAdmin: Keep branch field (must be provided)
        if (!isSuperAdmin) {
            delete cleanedData.branch;
        }

        // Remove empty optional fields
        const optionalFields = ['sap_number', 'lr_submitted_time', 'destination', 'delivery_at', 
            'grade', 'grade_quantity', 'loading_from_department', 'please_load', 
            'number_of_loads', 'grade_type_of_pkg', 'expected_loading_date', 
            'actual_loading_date', 'expected_delivery_date', 'actual_delivery_date',
            'remarks', 'note', 'gst_payable_by'];
        
        optionalFields.forEach(field => {
            if (!cleanedData[field] || cleanedData[field] === '') {
                delete cleanedData[field];
            }
        });

        // Convert number fields to proper format
        if (cleanedData.quantity_mt) cleanedData.quantity_mt = parseFloat(cleanedData.quantity_mt);
        if (cleanedData.number_of_bags) cleanedData.number_of_bags = parseInt(cleanedData.number_of_bags);
        // No financial fields in LR - amounts are only in HPA

        onSubmit(cleanedData);
    };

    return (
        <>
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }} onClick={onClose}>
                <div
                    style={{
                        background: 'white',
                        borderRadius: '16px',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '32px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create New LR</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                            <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                            {/* Branch Selection - SuperAdmin only */}
                            {isSuperAdmin && (
                                <div style={{ gridColumn: 'span 2', background: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#92400e' }}>
                                        ⚠️ Branch * (SuperAdmin - Select branch for this LR)
                                    </label>
                                    <SearchableSelect
                                        options={branches}
                                        onSearch={branchSearch.searchFunction}
                                        value={formData.branch}
                                        onChange={handleChange}
                                        placeholder="Search branch by name/code"
                                        label={null}
                                        name="branch"
                                        required
                                        getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>
                            )}
                            
                            {!isSuperAdmin && (
                                <div style={{ gridColumn: 'span 2', background: '#d1fae5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '13px', color: '#065f46', margin: 0 }}>✓ Branch auto-assigned to your branch</p>
                                </div>
                            )}

                            {/* Truck */}
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={trucks}
                                            onSearch={truckSearch.searchFunction}
                                            value={formData.truck}
                                            onChange={handleTruckChange}
                                            placeholder="Search and select truck..."
                                            label="Truck"
                                            required
                                            name="truck"
                                            getOptionLabel={(opt) => opt.truck_number}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setShowTruckModal(true)}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 16px', minWidth: 'auto', height: '44px' }}
                                            title="Add New Truck"
                                        >
                                            <PlusIcon style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Consignor (Company sending goods) */}
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={consignors}
                                            onSearch={consignorSearch.searchFunction}
                                            value={formData.consignor}
                                            onChange={handleChange}
                                            placeholder="Search and select consignor..."
                                            label="Consignor (Company sending goods)"
                                            required
                                            name="consignor"
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setShowConsignorModal(true)}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 16px', minWidth: 'auto', height: '44px' }}
                                            title="Add New Consignor"
                                        >
                                            <PlusIcon style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Consignee (Destination party) */}
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={parties}
                                            onSearch={partySearch.searchFunction}
                                            value={formData.consignee}
                                            onChange={handleChange}
                                            placeholder="Search and select consignee/party..."
                                            label="Consignee (Destination party)"
                                            required
                                            name="consignee"
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPartyModal(true)}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 16px', minWidth: 'auto', height: '44px' }}
                                            title="Add New Party"
                                        >
                                            <PlusIcon style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* LR Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    LR Date *
                                </label>
                                <input type="date" name="lr_date" className="input" required onChange={handleChange} value={formData.lr_date} />
                            </div>

                            {/* SAP Number */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    SAP Number
                                </label>
                                <input type="text" name="sap_number" className="input" onChange={handleChange} value={formData.sap_number} placeholder="Optional" />
                            </div>

                            {/* From Location */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    From Location *
                                </label>
                                <input type="text" name="from_location" className="input" required onChange={handleChange} value={formData.from_location} placeholder="Mumbai" />
                            </div>

                            {/* To Location */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    To Location *
                                </label>
                                <input type="text" name="to_location" className="input" required onChange={handleChange} value={formData.to_location} placeholder="Bangalore" />
                            </div>

                            {/* Material Description */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Material Description *
                                </label>
                                <textarea name="material_description" className="input" required onChange={handleChange} value={formData.material_description} rows="3" placeholder="Electronics, Textiles, etc." />
                            </div>

                            {/* Quantity (MT) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Quantity (M.T.) *
                                </label>
                                <input type="number" step="0.01" name="quantity_mt" className="input" required onChange={handleChange} value={formData.quantity_mt} placeholder="35" />
                            </div>

                            {/* Number of Bags */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Number of Bags *
                                </label>
                                <input type="number" name="number_of_bags" className="input" required onChange={handleChange} value={formData.number_of_bags} placeholder="700" />
                            </div>

                            {/* Grade */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Grade
                                </label>
                                <select name="grade" className="input" onChange={handleChange} value={formData.grade}>
                                    <option value="">Select Grade</option>
                                    <option value="53">Grade 53</option>
                                    <option value="43">Grade 43</option>
                                    <option value="OPC">OPC (Ordinary Portland Cement)</option>
                                    <option value="PPC">PPC (Portland Pozzolana Cement)</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Grade Quantity */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Grade Quantity
                                </label>
                                <input type="text" name="grade_quantity" className="input" onChange={handleChange} value={formData.grade_quantity} placeholder="35MT OPC" />
                            </div>

                            {/* Driver Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver Name *
                                </label>
                                <input type="text" name="driver_name" className="input" required onChange={handleChange} value={formData.driver_name} placeholder="Nitin" />
                            </div>

                            {/* Driver Phone */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver Mobile *
                                </label>
                                <input type="tel" name="driver_phone" className="input" required onChange={handleChange} value={formData.driver_phone} placeholder="9075051501" />
                            </div>

                            {/* Driver License */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver License No. *
                                </label>
                                <input type="text" name="driver_license_no" className="input" required onChange={handleChange} value={formData.driver_license_no} placeholder="MH13233" />
                            </div>

                            {/* Payment Term */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Payment Term *
                                </label>
                                <select name="payment_term" className="input" required onChange={handleChange} value={formData.payment_term}>
                                    <option value="TO_BE_BILLED">To Be Billed</option>
                                    <option value="TO_PAY">To Pay</option>
                                    <option value="PAID">Paid</option>
                                </select>
                            </div>

                            {/* Destination */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Destination
                                </label>
                                <input type="text" name="destination" className="input" onChange={handleChange} value={formData.destination} placeholder="Final destination if different" />
                            </div>

                            {/* Delivery At */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Delivery At
                                </label>
                                <input type="text" name="delivery_at" className="input" onChange={handleChange} value={formData.delivery_at} placeholder="Specific delivery location" />
                            </div>

                            {/* Status */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Status *
                                </label>
                                <select name="status" className="input" required onChange={handleChange} value={formData.status}>
                                    <option value="DRAFT">Draft</option>
                                    <option value="ISSUED">Issued to Driver</option>
                                    <option value="LOADING">At Loading Point</option>
                                    <option value="IN_TRANSIT">In Transit</option>
                                    <option value="AT_UNLOADING">At Unloading Point</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            {/* Expected Loading Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Expected Loading Date
                                </label>
                                <input type="date" name="expected_loading_date" className="input" onChange={handleChange} value={formData.expected_loading_date} />
                            </div>

                            {/* Expected Delivery Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Expected Delivery Date
                                </label>
                                <input type="date" name="expected_delivery_date" className="input" onChange={handleChange} value={formData.expected_delivery_date} />
                            </div>

                            {/* Remarks */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Remarks
                                </label>
                                <textarea name="remarks" className="input" onChange={handleChange} value={formData.remarks} rows="2" placeholder="Any additional notes..." />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create LR'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Branch Create Modal */}
            {showBranchModal && <CreateBranchModal onClose={() => setShowBranchModal(false)} />}

            {/* Truck Create Modal */}
            {showTruckModal && <CreateTruckModal onClose={() => setShowTruckModal(false)} />}

            {/* Consignor Create Modal */}
            {showConsignorModal && <CreateConsignorModal onClose={() => setShowConsignorModal(false)} />}

            {/* Party Create Modal */}
            {showPartyModal && <CreatePartyModal onClose={() => setShowPartyModal(false)} />}
        </>
    );
}

function EditLRModal({ lr, branches, trucks, consignors, parties, onClose, onSubmit, isLoading }) {
    const truckSearch = useSearchableSelect('/masters/trucks/');
    const consignorSearch = useSearchableSelect('/masters/consignors/');
    const partySearch = useSearchableSelect('/masters/parties/');

    const [formData, setFormData] = useState({
        branch: lr.branch || '',
        from_location: lr.from_location || '',
        to_location: lr.to_location || '',
        truck: lr.truck || '',
        driver_name: lr.driver_name || '',
        driver_phone: lr.driver_phone || '',
        driver_license_no: lr.driver_license_no || '',
        consignor: lr.consignor || '',
        consignee: lr.consignee || '',
        quantity_mt: lr.quantity_mt || '',
        number_of_bags: lr.number_of_bags || '',
        lr_number: lr.lr_number || '',
        lr_date: lr.lr_date || new Date().toISOString().split('T')[0],
        sap_number: lr.sap_number || '',
        material_description: lr.material_description || '',
        remarks: lr.remarks || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error updating LR:', error);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    maxWidth: '900px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Edit LR - {lr.lr_number}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {/* Branch - Read only */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Branch
                            </label>
                            <div style={{
                                padding: '10px 12px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                border: '1px solid #e5e7eb'
                            }}>
                                {lr.branch_name || 'N/A'}
                            </div>
                        </div>

                        {/* LR Number - Read only */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                LR Number
                            </label>
                            <div style={{
                                padding: '10px 12px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                border: '1px solid #e5e7eb'
                            }}>
                                {lr.lr_number}
                            </div>
                        </div>

                        {/* From Location */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                From Location <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="from_location"
                                value={formData.from_location}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* To Location */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                To Location <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="to_location"
                                value={formData.to_location}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Truck */}
                        <div>
                            <SearchableSelect
                                options={trucks}
                                onSearch={truckSearch.searchFunction}
                                value={formData.truck}
                                onChange={handleChange}
                                placeholder="Search truck..."
                                label="Truck"
                                name="truck"
                                required
                                getOptionLabel={(opt) => `${opt.truck_number}${opt.capacity ? ` - ${opt.capacity} Ton` : ''}`}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>



                        {/* Driver Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Driver Name
                            </label>
                            <input
                                type="text"
                                name="driver_name"
                                value={formData.driver_name}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Driver Mobile */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Driver Mobile
                            </label>
                            <input
                                type="text"
                                name="driver_phone"
                                value={formData.driver_phone}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Consignor */}
                        <div>
                            <SearchableSelect
                                options={consignors}
                                onSearch={consignorSearch.searchFunction}
                                value={formData.consignor}
                                onChange={handleChange}
                                placeholder="Search consignor..."
                                label="Consignor"
                                name="consignor"
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>

                        {/* Consignee */}
                        <div>
                            <SearchableSelect
                                options={parties}
                                onSearch={partySearch.searchFunction}
                                value={formData.consignee}
                                onChange={handleChange}
                                placeholder="Search party..."
                                label="Consignee (Party)"
                                name="consignee"
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>

                        {/* Quantity MT */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Quantity (MT) <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                name="quantity_mt"
                                value={formData.quantity_mt}
                                onChange={handleChange}
                                required
                                step="0.01"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Number of Bags */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Number of Bags
                            </label>
                            <input
                                type="number"
                                name="number_of_bags"
                                value={formData.number_of_bags}
                                onChange={handleChange}
                                min="0"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* LR Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                LR Date
                            </label>
                            <input
                                type="date"
                                name="lr_date"
                                value={formData.lr_date}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* SAP Number */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                SAP Number
                            </label>
                            <input
                                type="text"
                                name="sap_number"
                                value={formData.sap_number}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    {/* Remarks */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                            Remarks
                        </label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Enter any remarks"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update LR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Create Branch Modal Component
function CreateBranchModal({ onClose }) {
    const [createBranch, { isLoading }] = useCreateBranchMutation();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        manager_username: '',
        manager_password: '',
        manager_email: '',
        manager_phone: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createBranch(formData).unwrap();
            alert('✅ Branch created successfully!');
            onClose();
        } catch (error) {
            alert('Error creating branch: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <QuickCreateModal title="Create New Branch" onClose={onClose} onSubmit={handleSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                    <label className="form-label">Branch Name *</label>
                    <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Branch Code *</label>
                    <input type="text" className="input" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address *</label>
                    <textarea className="input" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" />
                </div>
                <div>
                    <label className="form-label">City *</label>
                    <input type="text" className="input" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">State *</label>
                    <input type="text" className="input" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Pincode *</label>
                    <input type="text" className="input" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Phone</label>
                    <input type="tel" className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email</label>
                    <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                
                {/* Manager Credentials Section */}
                <div style={{ gridColumn: 'span 2', marginTop: '12px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                        Branch Manager User (Required)
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                        Create a branch manager account for this branch.
                    </p>
                </div>
                
                <div>
                    <label className="form-label">Manager Username *</label>
                    <input type="text" className="input" required value={formData.manager_username} onChange={(e) => setFormData({ ...formData, manager_username: e.target.value })} placeholder="e.g., branch_mgr_001" />
                </div>
                <div>
                    <label className="form-label">Manager Password *</label>
                    <input type="password" className="input" required value={formData.manager_password} onChange={(e) => setFormData({ ...formData, manager_password: e.target.value })} placeholder="Strong password" />
                </div>
                <div>
                    <label className="form-label">Manager Email *</label>
                    <input type="email" className="input" required value={formData.manager_email} onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })} placeholder="manager@branch.com" />
                </div>
                <div>
                    <label className="form-label">Manager Phone *</label>
                    <input type="tel" className="input" required value={formData.manager_phone} onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })} placeholder="8765432109" />
                </div>
            </div>
        </QuickCreateModal >
    );
}

// Create Truck Modal Component  
function CreateTruckModal({ onClose }) {
    const [createTruck, { isLoading }] = useCreateTruckMutation();
    const [formData, setFormData] = useState({
        truck_number: '',
        truck_type: 'MARKET',
        owner_name: '',
        owner_phone: '',
        driver_name: '',
        driver_phone: '',
        capacity_tons: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTruck(formData).unwrap();
            alert('Truck created successfully!');
            onClose();
        } catch (error) {
            alert('Error creating truck: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <QuickCreateModal title="Create New Truck" onClose={onClose} onSubmit={handleSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                    <label className="form-label">Truck Number *</label>
                    <input type="text" className="input" required value={formData.truck_number} onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })} placeholder="MH01AB1234" />
                </div>
                <div>
                    <label className="form-label">Truck Type *</label>
                    <select className="input" required value={formData.truck_type} onChange={(e) => setFormData({ ...formData, truck_type: e.target.value })}>
                        <option value="MARKET">Market Truck</option>
                        <option value="OWN">Own Truck</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Owner Name</label>
                    <input type="text" className="input" value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Owner Phone</label>
                    <input type="tel" className="input" value={formData.owner_phone} onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Driver Name</label>
                    <input type="text" className="input" value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Driver Phone</label>
                    <input type="tel" className="input" value={formData.driver_phone} onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Capacity (Tons)</label>
                    <input type="number" step="0.01" className="input" value={formData.capacity_tons} onChange={(e) => setFormData({ ...formData, capacity_tons: e.target.value })} />
                </div>
            </div>
        </QuickCreateModal>
    );
}

// Create Consignor Modal Component
function CreateConsignorModal({ onClose }) {
    const [createConsignor, { isLoading }] = useCreateConsignorMutation();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        gstin: '',
        pan: '',
        address: '',
        city: '',
        state: '',
        state_code: '',
        pincode: '',
        phone: '',
        email: '',
        contact_person: '',
        transporter_code: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createConsignor(formData).unwrap();
            alert('Consignor created successfully!');
            onClose();
        } catch (error) {
            alert('Error creating consignor: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <QuickCreateModal title="Create New Consignor" onClose={onClose} onSubmit={handleSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                    <label className="form-label">Consignor Name *</label>
                    <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Code *</label>
                    <input type="text" className="input" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">GSTIN *</label>
                    <input type="text" className="input" required value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} placeholder="29AAIFC4150D2ZO" />
                </div>
                <div>
                    <label className="form-label">PAN</label>
                    <input type="text" className="input" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address *</label>
                    <textarea className="input" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" />
                </div>
                <div>
                    <label className="form-label">City *</label>
                    <input type="text" className="input" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">State *</label>
                    <input type="text" className="input" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">State Code</label>
                    <input type="text" className="input" value={formData.state_code} onChange={(e) => setFormData({ ...formData, state_code: e.target.value })} placeholder="29" />
                </div>
                <div>
                    <label className="form-label">Pincode *</label>
                    <input type="text" className="input" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Phone</label>
                    <input type="tel" className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email</label>
                    <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Contact Person</label>
                    <input type="text" className="input" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Transporter Code</label>
                    <input type="text" className="input" value={formData.transporter_code} onChange={(e) => setFormData({ ...formData, transporter_code: e.target.value })} placeholder="36000023" />
                </div>
            </div>
        </QuickCreateModal>
    );
}

// Create Party Modal Component
function CreatePartyModal({ onClose }) {
    const [createParty, { isLoading }] = useCreatePartyMutation();
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        gstin: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createParty(formData).unwrap();
            alert('Party created successfully!');
            onClose();
        } catch (error) {
            alert('Error creating party: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <QuickCreateModal title="Create New Party" onClose={onClose} onSubmit={handleSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                    <label className="form-label">Party Name *</label>
                    <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Party Code *</label>
                    <input type="text" className="input" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">GSTIN</label>
                    <input type="text" className="input" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Address *</label>
                    <textarea className="input" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" />
                </div>
                <div>
                    <label className="form-label">City *</label>
                    <input type="text" className="input" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">State *</label>
                    <input type="text" className="input" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Pincode *</label>
                    <input type="text" className="input" required value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Phone *</label>
                    <input type="tel" className="input" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email</label>
                    <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
            </div>
        </QuickCreateModal>
    );
}

// Reusable Quick Create Modal
function QuickCreateModal({ title, children, onClose, onSubmit, isLoading }) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
        }} onClick={onClose}>
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <XMarkIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={onSubmit}>
                    {children}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 16px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '8px 16px' }}>
                            {isLoading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
