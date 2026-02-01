import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetHPAsQuery, useCreateHPAMutation, useUpdateHPAMutation, useMarkAsPaidMutation, useGetHPATransactionsQuery, useGetHPAInvoicesQuery, useAddHPAInvoiceMutation, useDeleteHPAInvoiceMutation } from '../features/hpa/hpaApi';
import { useCreatePODMutation } from '../features/pod/podApi';
import { useGetLRsWithoutHPAQuery } from '../features/lr/lrApi';
import { useGetBranchesQuery, useGetTrucksQuery } from '../features/masters/mastersApi';
import { useAuth } from '../hooks/useAuth';
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon, BanknotesIcon, PencilIcon, ArrowDownTrayIcon, EyeIcon, ShareIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchableSelect } from '../hooks/useSearchableSelect';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export default function HPAManagement() {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
    const [selectedHPA, setSelectedHPA] = useState(null);
    const [acknowledgeHPA, setAcknowledgeHPA] = useState(null);
    const [filters, setFilters] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: hpasData, isLoading: isLoadingHPAs } = useGetHPAsQuery({ ...filters, search: debouncedSearch, page, page_size: pageSize });
    const [createHPA, { isLoading: isCreating }] = useCreateHPAMutation();
    const [updateHPA, { isLoading: isUpdating }] = useUpdateHPAMutation();
    const [createPOD, { isLoading: isAcknowledging }] = useCreatePODMutation();
    const { canEdit } = useAuth();

    // Extract arrays from API response
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);

    const handleCreateHPA = async (formData) => {
        try {
            await createHPA(formData).unwrap();
            setShowCreateModal(false);
            alert('✅ HPA created successfully! HPA number matches LR number.');
        } catch (error) {
            console.error('Error creating HPA:', error);
            let errorMessage = 'Error creating HPA:\n\n';
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

    const handleUpdateHPA = async (formData) => {
        try {
            await updateHPA({ id: selectedHPA.id, ...formData }).unwrap();
            setShowEditModal(false);
            setSelectedHPA(null);
            alert('✅ HPA updated successfully!');
        } catch (error) {
            console.error('Error updating HPA:', error);
            let errorMessage = 'Error updating HPA:\n\n';
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

    const handleAcknowledgeDelivery = async (formData) => {
        try {
            await createPOD(formData).unwrap();
            setShowAcknowledgeModal(false);
            setAcknowledgeHPA(null);
            alert('✅ Delivery acknowledged successfully!');
        } catch (error) {
            console.error('Error acknowledging delivery:', error);
            let errorMessage = 'Error acknowledging delivery:\n\n';
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


    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'PAID':
                return 'badge-success';
            case 'PARTIAL':
                return 'badge-warning';
            case 'PENDING_BILL':
            case 'PENDING':
                return 'badge-error';
            default:
                return 'badge-error';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        <span className="gradient-text">HPA Management</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Create and manage Hire Payment Advices (HPA number matches LR number)</p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/hpa/create')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    Create New HPA
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
                                placeholder="HPA Number, Invoice Number, LR Number..."
                                style={{ paddingLeft: '40px' }}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                            Payment Status
                        </label>
                        <select
                            className="input"
                            onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                        >
                            <option value="">All Status</option>
                            <option value="PENDING_BILL">Open (Pending Bill)</option>
                            <option value="PENDING">Pending Payment</option>
                            <option value="PARTIAL">Partially Paid</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* HPA List */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Hire Payment Advices</h2>
                {isLoadingHPAs ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
                ) : hpas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No HPAs found. Create your first HPA!</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        {/* Pagination controls */}
                        {hpasData?.count !== undefined && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                <button className="btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={!hpasData?.previous}>Prev</button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {page}</span>
                                <button className="btn" onClick={() => setPage(page + 1)} disabled={!hpasData?.next}>Next</button>
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 25); setPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>Total: {hpasData?.count || hpas.length}</span>
                            </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>HPA Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Invoice No</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Lorry Hire</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Deductions</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Balance</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hpas.map((hpa, index) => (
                                    <tr
                                        key={hpa.id}
                                        style={{ borderBottom: index < hpas.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{hpa.hpa_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                            {hpa.invoice_count > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hpa.invoice_list}>
                                                        {hpa.invoice_list?.split(',').slice(0, 2).join(', ')}
                                                    </span>
                                                    {hpa.invoice_count > 2 && (
                                                        <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                            +{hpa.invoice_count - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (hpa.invoice_number || '-')}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{hpa.hpa_date ? new Date(hpa.hpa_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563', fontWeight: 600 }}>{hpa.lr_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{hpa.truck_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                            ₹{parseFloat(hpa.lorry_hire_rs || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#ef4444', textAlign: 'right' }}>
                                            -₹{parseFloat(hpa.total_deductions || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                                            ₹{parseFloat(hpa.balance_rs || hpa.balance_amount || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(hpa.payment_status)}`}>
                                                {hpa.payment_status || 'PENDING'}
                                            </span>
                                            {canEdit && (
                                                <select
                                                    style={{ marginLeft: '8px', fontSize: '12px' }}
                                                    value={hpa.payment_status}
                                                    onChange={e => updateHPA({ id: hpa.id, payment_status: e.target.value })}
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="PARTIAL">Partial</option>
                                                    <option value="PAID">Paid</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedHPA(hpa);
                                                        setShowViewModal(true);
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#10b981' }}
                                                    title="View HPA & Transactions"
                                                >
                                                    <EyeIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const token = localStorage.getItem('token');
                                                        const url = `http://localhost:8000/api/v1/hpa/hire-payment-advices/${hpa.id}/download_pdf/`;
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
                                                            a.download = `HPA_${hpa.hpa_number}.pdf`;
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
                                                    title="Download HPA PDF"
                                                >
                                                    <ArrowDownTrayIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const token = localStorage.getItem('token');
                                                        const url = `http://localhost:8000/api/v1/hpa/hire-payment-advices/${hpa.id}/download_pdf/`;
                                                        fetch(url, {
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`
                                                            }
                                                        })
                                                        .then(response => response.blob())
                                                        .then(blob => {
                                                            const blobUrl = window.URL.createObjectURL(blob);
                                                            const message = `HPA ${hpa.hpa_number} - Click to view: ${blobUrl}`;
                                                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                                                            window.open(whatsappUrl, '_blank');
                                                            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
                                                        })
                                                        .catch(error => {
                                                            console.error('Error sharing PDF:', error);
                                                            alert('Error sharing PDF. Please try again.');
                                                        });
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#25D366' }}
                                                    title="Share on WhatsApp"
                                                >
                                                    <ShareIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setAcknowledgeHPA(hpa);
                                                        setShowAcknowledgeModal(true);
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#0ea5e9' }}
                                                    title="Acknowledge Delivery"
                                                >
                                                    <DocumentArrowUpIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => navigate(`/hpa/edit/${hpa.id}`)}
                                                        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1' }}
                                                        title="Edit HPA"
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

            {/* Create HPA Modal */}
            {showCreateModal && (
                <CreateHPAModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateHPA}
                    isLoading={isCreating}
                />
            )}

            {/* View HPA Modal */}
            {showViewModal && selectedHPA && (
                <ViewHPAModal
                    hpa={selectedHPA}
                    onClose={() => {
                        setShowViewModal(false);
                        setSelectedHPA(null);
                    }}
                />
            )}

            {/* Edit HPA Modal */}
            {showEditModal && selectedHPA && (
                <EditHPAModal
                    hpa={selectedHPA}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedHPA(null);
                    }}
                    onSubmit={handleUpdateHPA}
                    isLoading={isUpdating}
                />
            )}

            {/* Acknowledge Delivery Modal */}
            {showAcknowledgeModal && acknowledgeHPA && (
                <AcknowledgeDeliveryModal
                    hpa={acknowledgeHPA}
                    onClose={() => {
                        setShowAcknowledgeModal(false);
                        setAcknowledgeHPA(null);
                    }}
                    onSubmit={handleAcknowledgeDelivery}
                    isLoading={isAcknowledging}
                />
            )}
        </div>
    );
}

function CreateHPAModal({ onClose, onSubmit, isLoading }) {
    const { user, isSuperAdmin } = useAuth();

    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);

    const { data: trucksData, isLoading: isLoadingTrucks } = useGetTrucksQuery();
    const trucks = Array.isArray(trucksData) ? trucksData : (trucksData?.results || []);
    
    // Search hooks for searchable selects
    const truckSearch = useSearchableSelect('/masters/trucks/');

    const [selectedBranchId, setSelectedBranchId] = useState(isSuperAdmin ? '' : String(user?.branch?.id || ''));
    
    // Initialize formData state BEFORE using it in other hooks
    const [formData, setFormData] = useState({
        branch: isSuperAdmin ? '' : String(user?.branch?.id || ''), // SuperAdmin must provide, branch users get auto-assignment
        lr: '',  // Primary LR (for backward compatibility)
        lrs: [],  // Multiple LRs (array of LR IDs)
        truck: '',  // Added truck field - REQUIRED and EDITABLE
        invoice_number: '',
        hpa_date: new Date().toISOString().split('T')[0],
        from_location: '',
        to_location: '',
        owner_name: '',
        owner_mob: '',
        driver_name: '',
        driver_mob: '',
        lr_reference: '',
        tons: '',
        rate_per_tonne: '',
        lorry_hire_rs: '',
        advance_paid_rs: '0',
        diesel_amount: '0',
        pump_name: '',
        bank_amount: '0',
        other_deductions: '0',
        other_deductions_description: '',
        note: 'I have received above quantity in good condition & I am responsible for good delivery to the party\nminimum 3 Delivery',
        remarks: '',
    });

    const [selectedLR, setSelectedLR] = useState(null);
    const [selectedLRs, setSelectedLRs] = useState([]);  // Multiple selected LRs
    const [calculatedValues, setCalculatedValues] = useState({
        totalDeductions: 0,
        balanceRs: 0,
        lorryHire: 0,
    });

    // Build query params for LR fetch
    const lrQueryParams = selectedBranchId 
        ? { branch: selectedBranchId } 
        : (!isSuperAdmin && user?.branch?.id ? { branch: String(user?.branch?.id) } : {});
    
    // Fetch LRs without HPA filtered by selected branch
    const { data: lrsData, isLoading: isLoadingLRs, refetch: refetchLRs } = useGetLRsWithoutHPAQuery(
        lrQueryParams,
        { skip: isSuperAdmin && !selectedBranchId } // Only skip for SuperAdmin when no branch selected
    );
    const lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || []);
    
    // Debug logging
    useEffect(() => {
        console.log('========== HPA Modal Debug ==========');
        console.log('HPA Modal - isSuperAdmin:', isSuperAdmin);
        console.log('HPA Modal - selectedBranchId:', selectedBranchId, 'Type:', typeof selectedBranchId);
        console.log('HPA Modal - formData.branch:', formData.branch, 'Type:', typeof formData.branch);
        console.log('HPA Modal - lrQueryParams:', JSON.stringify(lrQueryParams));
        console.log('HPA Modal - Skip query?:', isSuperAdmin && !selectedBranchId);
        console.log('HPA Modal - LRs data:', lrsData);
        console.log('HPA Modal - LRs count:', lrs.length);
        console.log('HPA Modal - isLoadingLRs:', isLoadingLRs);
        console.log('=====================================');
    }, [isSuperAdmin, selectedBranchId, formData.branch, lrQueryParams, lrs.length, lrsData, isLoadingLRs]);

    // Note: Branch is auto-assigned by backend, no need to manage selectedBranchId

    // Handle LR selection (single or multiple)
    const handleLRSelection = (lrId, isChecked) => {
        const lrIdNum = parseInt(lrId);
        if (isChecked) {
            // Add to selection
            if (!selectedLRs.find(lr => lr.id === lrIdNum)) {
                const lr = lrs.find(l => l.id === lrIdNum);
                if (lr) {
                    const newSelected = [...selectedLRs, lr];
                    setSelectedLRs(newSelected);
                    updateFormFromLRs(newSelected);
                }
            }
        } else {
            // Remove from selection
            const newSelected = selectedLRs.filter(lr => lr.id !== lrIdNum);
            setSelectedLRs(newSelected);
            if (newSelected.length > 0) {
                updateFormFromLRs(newSelected);
            } else {
                // Reset form if no LRs selected
                setFormData(prev => ({
                    ...prev,
                    lr: '',
                    lrs: [],
                    truck: '',
                    from_location: '',
                    to_location: '',
                    driver_name: '',
                    driver_mob: '',
                    lr_reference: '',
                    tons: '',
                }));
            }
        }
    };

    // Update form data from selected LRs
    const updateFormFromLRs = (selectedLRsList) => {
        if (selectedLRsList.length === 0) return;

        const firstLR = selectedLRsList[0];
        
        // Calculate total tons from all selected LRs
        const totalTons = selectedLRsList.reduce((sum, lr) => {
            return sum + parseFloat(lr.total_quantity_mt || lr.quantity_mt || 0);
        }, 0);

        // Build LR reference string
        const lrNumbers = selectedLRsList.map(lr => lr.lr_number);
        const lrReference = selectedLRsList.length === 1 
            ? lrNumbers[0]
            : `${lrNumbers[0]} (+${selectedLRsList.length - 1} more)`;

        setFormData(prev => ({
            ...prev,
            lr: String(firstLR.id),  // Primary LR for backward compatibility
            lrs: selectedLRsList.map(lr => lr.id),  // Array of LR IDs
            branch: firstLR.branch || prev.branch,
            truck: firstLR.truck || prev.truck,
            from_location: firstLR.from_location || firstLR.primary_from_location || prev.from_location,
            to_location: firstLR.to_location || firstLR.primary_to_location || prev.to_location,
            driver_name: firstLR.driver_name || prev.driver_name,
            driver_mob: firstLR.driver_phone || prev.driver_mob,
            lr_reference: lrReference,
            tons: totalTons,
            invoice_number: firstLR.sap_number || prev.invoice_number,
            rate_per_tonne: prev.rate_per_tonne,  // Keep user's rate
        }));

        // Update selectedBranchId
        if (firstLR.branch) {
            setSelectedBranchId(firstLR.branch);
        }
    };

    // Get selected LR details and auto-populate (backward compatibility for single LR)
    useEffect(() => {
        if (formData.lr && selectedLRs.length === 0) {
            const lr = lrs.find(l => l.id === parseInt(formData.lr));
            setSelectedLR(lr);
            if (lr) {
                setSelectedLRs([lr]);
                updateFormFromLRs([lr]);
            }
        } else if (!formData.lr && selectedLRs.length === 0) {
            setSelectedLR(null);
        }
    }, [formData.lr, lrs]);

    // Calculate lorry hire when tons or rate changes
    useEffect(() => {
        if (formData.tons && formData.rate_per_tonne) {
            const lorryHire = parseFloat(formData.tons) * parseFloat(formData.rate_per_tonne);
            setFormData(prev => ({ ...prev, lorry_hire_rs: lorryHire.toFixed(2) }));
        // Note: LR doesn't have freight_amount - lorry_hire_rs is calculated from tons × rate
        }
    }, [formData.tons, formData.rate_per_tonne, selectedLRs]);

    // Calculate totals whenever deductions or lorry hire change
    useEffect(() => {
        const totalDeductions = parseFloat(formData.advance_paid_rs || 0) +
            parseFloat(formData.diesel_amount || 0) +
            parseFloat(formData.bank_amount || 0) +
            parseFloat(formData.other_deductions || 0);

        const lorryHire = parseFloat(formData.lorry_hire_rs || 0);
        const balanceRs = lorryHire - totalDeductions;

        setCalculatedValues({
            totalDeductions,
            balanceRs,
            lorryHire,
        });
    }, [formData.advance_paid_rs, formData.diesel_amount, formData.bank_amount, formData.other_deductions, formData.lorry_hire_rs]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // If branch changes, update selectedBranchId to refetch LRs
        if (name === 'branch') {
            console.log('Branch changed to:', value, 'Type:', typeof value);
            const branchValue = String(value); // Ensure it's a string
            setSelectedBranchId(branchValue);
            setFormData(prev => ({ ...prev, [name]: branchValue, lr: '' })); // Clear LR selection when branch changes
            // Trigger refetch after state update
            setTimeout(() => {
                console.log('Calling refetchLRs with selectedBranchId:', branchValue);
                refetchLRs();
            }, 100);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate at least one LR is selected
        if (selectedLRs.length === 0) {
            alert('Please select at least one LR');
            return;
        }

        // Clean up the form data
        const cleanedData = { ...formData };
        
        // Use selectedLRs array instead of single lr
        if (selectedLRs.length > 0) {
            cleanedData.lrs = selectedLRs.map(lr => lr.id);
            cleanedData.lr = selectedLRs[0].id;  // Primary LR for backward compatibility
        }
        
        // Branch managers: Remove branch field (backend auto-assigns from user.branch)
        // SuperAdmin: Keep branch field (must be provided)
        if (!isSuperAdmin) {
            delete cleanedData.branch;
        }
        
        const optionalFields = ['invoice_number', 'owner_name', 'owner_mob', 'pump_name', 
            'other_deductions_description', 'note', 'remarks'];
        
        optionalFields.forEach(field => {
            if (!cleanedData[field] || cleanedData[field] === '') {
                delete cleanedData[field];
            }
        });

        // Convert numbers - these MUST be sent as 0 if empty, never deleted
        const numberFields = ['tons', 'rate_per_tonne', 'lorry_hire_rs', 'advance_paid_rs', 'diesel_amount', 
                              'bank_amount', 'other_deductions'];
        numberFields.forEach(field => {
            if (cleanedData[field] || cleanedData[field] === 0 || cleanedData[field] === '0') {
                cleanedData[field] = parseFloat(cleanedData[field] || 0);
            } else {
                // Set to 0 if not provided
                cleanedData[field] = 0;
            }
        });
        
        // Note: truck, from_location, to_location, driver_name, driver_mob, lr_reference, tons
        // will be auto-populated from LR by the backend if not provided, so we don't need to
        // include them if empty. However, if they are provided, keep them.

        onSubmit(cleanedData);
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
                    maxWidth: '1000px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create New HPA</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>HPA number will match LR number automatically</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        {/* Branch Selection - SuperAdmin only */}
                        {isSuperAdmin && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Branch *
                                </label>
                                <select name="branch" className="input" required onChange={handleChange} value={formData.branch}>
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                                    ))}
                                </select>
                                <div style={{ marginTop: '8px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                    <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                                        ⚠️ <strong>Select branch for this HPA.</strong> Branch users get auto-assigned.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* HPA Date */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                HPA Date *
                            </label>
                            <input type="date" name="hpa_date" className="input" required onChange={handleChange} value={formData.hpa_date} />
                        </div>

                        {/* LR Selection - CRITICAL - Now supports multiple LRs */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Select LR(s) * {selectedLRs.length > 0 && `(${selectedLRs.length} selected)`}
                            </label>
                            {isSuperAdmin && !selectedBranchId ? (
                                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                    <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                                        ⚠️ Please select a branch first to see available LRs
                                    </p>
                                </div>
                            ) : isLoadingLRs ? (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                                    Loading LRs...
                                </div>
                            ) : lrs.length === 0 ? (
                                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                    <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                                        ⚠️ No LRs available for this branch without HPA. All LRs already have HPAs created.
                                    </p>
                                </div>
                            ) : (
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    padding: '12px'
                                }}>
                                    {lrs.map(lr => {
                                        const isSelected = selectedLRs.some(sel => sel.id === lr.id);
                                        return (
                                            <label
                                                key={lr.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '12px',
                                                    marginBottom: '8px',
                                                    background: isSelected ? '#f0f9ff' : 'white',
                                                    border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => handleLRSelection(lr.id, e.target.checked)}
                                                    style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                                                        {lr.lr_number}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                        {lr.consignor_name || '-'} → {lr.consignee_name || '-'} | {lr.truck_number || '-'} | {parseFloat(lr.total_quantity_mt || lr.quantity_mt || 0).toFixed(2)} MT
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {selectedLRs.length > 0 && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                                            <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
                                                ✓ {selectedLRs.length} LR{selectedLRs.length !== 1 ? 's' : ''} selected. HPA Number will be: <strong>{selectedLRs[0].lr_number}</strong>
                                            </p>
                                            <p style={{ fontSize: '12px', color: '#166534', marginTop: '4px', marginBottom: 0 }}>
                                                Total Tons: <strong>{selectedLRs.reduce((sum, lr) => sum + parseFloat(lr.total_quantity_mt || lr.quantity_mt || 0), 0).toFixed(2)} MT</strong>
                                            </p>
                                        </div>
                                    )}
                                    {lrs.length > 0 && (
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                                            {lrs.length} LR{lrs.length !== 1 ? 's' : ''} available without HPA
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Invoice Number */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Invoice Number
                            </label>
                            <input type="text" name="invoice_number" className="input" onChange={handleChange} value={formData.invoice_number} placeholder="20153572" />
                        </div>

                        {/* Vehicle Number (Truck) - REQUIRED and EDITABLE */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Vehicle Number (Truck) *
                            </label>
                            <SearchableSelect
                                options={trucks}
                                onSearch={truckSearch.searchFunction}
                                value={formData.truck}
                                onChange={handleChange}
                                placeholder="Search and select vehicle number..."
                                name="truck"
                                required
                                getOptionLabel={(opt) => `${opt.truck_number}${opt.owner_name ? ` - ${opt.owner_name}` : ''}${opt.driver_name ? ` - Driver: ${opt.driver_name}` : ''}`}
                                getOptionValue={(opt) => opt.id}
                            />
                            {selectedLRs.length > 0 && selectedLRs[0].truck && (
                                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                                    ✓ Pre-filled from LR: <strong>{selectedLRs[0].truck_number}</strong> - You can change it if needed
                                </p>
                            )}
                        </div>

                        {/* LR Reference */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                LR Reference
                            </label>
                            <input type="text" name="lr_reference" className="input" onChange={handleChange} value={formData.lr_reference} placeholder="Auto from LR" readOnly style={{ background: '#f9fafb' }} />
                        </div>

                        {/* Auto-populated info box */}
                        {selectedLRs.length > 0 && (
                            <div style={{ gridColumn: 'span 2', padding: '16px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0369a1' }}>
                                    Auto-populated from {selectedLRs.length === 1 ? 'LR' : `First LR (${selectedLRs.length} LRs selected)`}:
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>From</p>
                                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLRs[0].from_location || selectedLRs[0].primary_from_location || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>To</p>
                                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLRs[0].to_location || selectedLRs[0].primary_to_location || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Truck</p>
                                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLRs[0].truck_number || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* From/To Locations */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                From Location *
                            </label>
                            <input type="text" name="from_location" className="input" required onChange={handleChange} value={formData.from_location} placeholder="Auto from LR" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                To Location *
                            </label>
                            <input type="text" name="to_location" className="input" required onChange={handleChange} value={formData.to_location} placeholder="Auto from LR" />
                        </div>

                        {/* Owner Details */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Owner Name
                            </label>
                            <input type="text" name="owner_name" className="input" onChange={handleChange} value={formData.owner_name} placeholder="If different from truck master" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Owner Mobile
                            </label>
                            <input type="tel" name="owner_mob" className="input" onChange={handleChange} value={formData.owner_mob} placeholder="Optional" />
                        </div>

                        {/* Driver Details */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Driver Name *
                            </label>
                            <input type="text" name="driver_name" className="input" required onChange={handleChange} value={formData.driver_name} placeholder="Auto from LR" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Driver Mobile *
                            </label>
                            <input type="tel" name="driver_mob" className="input" required onChange={handleChange} value={formData.driver_mob} placeholder="Auto from LR" />
                        </div>

                        {/* Quantity and Rate */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Tons *
                            </label>
                            <input type="number" step="0.01" name="tons" className="input" required onChange={handleChange} value={formData.tons} placeholder="Auto from LR" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Rate per Tonne (₹) *
                            </label>
                            <input type="number" step="0.01" name="rate_per_tonne" className="input" required onChange={handleChange} value={formData.rate_per_tonne} placeholder="983" />
                        </div>

                        {/* Lorry Hire (Auto-calculated) */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Lorry Hire Rs. * (Auto-calculated: Tons × Rate)
                            </label>
                            <input type="number" step="0.01" name="lorry_hire_rs" className="input" required onChange={handleChange} value={formData.lorry_hire_rs} readOnly style={{ background: '#f9fafb', fontWeight: 600, fontSize: '16px' }} />
                        </div>

                        {/* Deductions Section - Money already paid/deducted before final settlement */}
                        <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#111827', borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>
                                Deductions (Already Paid/Deducted)
                            </h3>
                            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                                Enter amounts already paid to driver or deducted (advance, diesel, bank charges, etc.). Final payments are tracked separately via Transactions.
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Less Advance (₹)
                            </label>
                            <input type="number" step="0.01" name="advance_paid_rs" className="input" onChange={handleChange} value={formData.advance_paid_rs} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Diesel Amount (₹)
                            </label>
                            <input type="number" step="0.01" name="diesel_amount" className="input" onChange={handleChange} value={formData.diesel_amount} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Pump Name
                            </label>
                            <input type="text" name="pump_name" className="input" onChange={handleChange} value={formData.pump_name} placeholder="Shyamkey" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Bank Amount (₹)
                            </label>
                            <input type="number" step="0.01" name="bank_amount" className="input" onChange={handleChange} value={formData.bank_amount} placeholder="0" />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Any Other Charges (₹)
                            </label>
                            <input type="number" step="0.01" name="other_deductions" className="input" onChange={handleChange} value={formData.other_deductions} placeholder="0" />
                        </div>

                        {/* Calculated Summary */}
                        <div style={{ gridColumn: 'span 2', padding: '20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px', border: '2px solid #10b981' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '12px' }}>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Total Lorry Hire</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>₹{calculatedValues.lorryHire.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Already Deducted</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>-₹{calculatedValues.totalDeductions.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Balance To Pay</p>
                                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>₹{calculatedValues.balanceRs.toLocaleString()}</p>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #86efac', paddingTop: '12px' }}>
                                <p style={{ fontSize: '13px', color: '#059669', fontWeight: 600, textAlign: 'center' }}>
                                    💡 Tip: After creating HPA, use the View button to track final payments via Transactions
                                </p>
                            </div>
                        </div>

                        {/* Note */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Note (Default delivery note)
                            </label>
                            <textarea name="note" className="input" onChange={handleChange} value={formData.note} rows="2" placeholder="Delivery note..." />
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
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !formData.lr}>
                            {isLoading ? 'Creating...' : 'Create HPA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditHPAModal({ hpa, onClose, onSubmit, isLoading }) {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPERADMIN';

    const { data: branchesData } = useGetBranchesQuery();
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);

    const { data: trucksData } = useGetTrucksQuery();
    const trucks = Array.isArray(trucksData) ? trucksData : (trucksData?.results || []);

    const [formData, setFormData] = useState({
        branch: hpa.branch || '',
        lr: hpa.lr || '',
        truck: hpa.truck || '',
        invoice_number: hpa.invoice_number || '',
        hpa_date: hpa.hpa_date || new Date().toISOString().split('T')[0],
        from_location: hpa.from_location || '',
        to_location: hpa.to_location || '',
        owner_name: hpa.owner_name || '',
        owner_mob: hpa.owner_mob || '',
        driver_name: hpa.driver_name || '',
        driver_mob: hpa.driver_mob || '',
        lr_reference: hpa.lr_reference || '',
        tons: hpa.tons || '',
        rate_per_tonne: hpa.rate_per_tonne || '',
        lorry_hire_rs: hpa.lorry_hire_rs || '',
        advance_paid_rs: hpa.advance_paid_rs || '0',
        diesel_amount: hpa.diesel_amount || '0',
        pump_name: hpa.pump_name || '',
        bank_amount: hpa.bank_amount || '0',
        other_deductions: hpa.other_deductions || '0',
        note: hpa.note || '',
        remarks: hpa.remarks || '',
    });

    const [calculatedValues, setCalculatedValues] = useState({
        totalDeductions: 0,
        balanceRs: 0,
        lorryHire: 0,
    });

    // Calculate balance and deductions
    useEffect(() => {
        const lorryHire = parseFloat(formData.lorry_hire_rs) || 0;
        const advance = parseFloat(formData.advance_paid_rs) || 0;
        const diesel = parseFloat(formData.diesel_amount) || 0;
        const bank = parseFloat(formData.bank_amount) || 0;
        const other = parseFloat(formData.other_deductions) || 0;

        const totalDeductions = advance + diesel + bank + other;
        const balanceRs = lorryHire - totalDeductions;

        setCalculatedValues({
            totalDeductions,
            balanceRs: balanceRs < 0 ? 0 : balanceRs,
            lorryHire,
        });
    }, [formData.lorry_hire_rs, formData.advance_paid_rs, formData.diesel_amount, formData.bank_amount, formData.other_deductions]);

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
            console.error('Error updating HPA:', error);
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
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Edit HPA - {hpa.hpa_number}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {/* Branch - Read only for non-superadmin */}
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
                                {hpa.branch_name || 'N/A'}
                            </div>
                        </div>

                        {/* LR - Read only */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Lorry Receipt (LR)
                            </label>
                            <div style={{
                                padding: '10px 12px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                border: '1px solid #e5e7eb'
                            }}>
                                {hpa.lr?.lr_number || 'N/A'}
                            </div>
                        </div>

                        {/* Truck Selection - Editable */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Truck <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                name="truck"
                                value={formData.truck}
                                onChange={(e) => handleSelectChange('truck', e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                            >
                                <option value="">Select Truck...</option>
                                {trucks.map(truck => (
                                    <option key={truck.id} value={truck.id}>
                                        {truck.registration_number} - {truck.capacity} Ton
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Invoice Number */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                name="invoice_number"
                                value={formData.invoice_number}
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

                        {/* HPA Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                HPA Date
                            </label>
                            <input
                                type="date"
                                name="hpa_date"
                                value={formData.hpa_date}
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

                    {/* Pre-filled from LR */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>From Location</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.from_location || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>To Location</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.to_location || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Owner Name</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.owner_name || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Owner Mobile</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.owner_mob || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Driver Name</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.driver_name || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Driver Mobile</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.driver_mob || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>LR Number</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.lr_reference || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Tons</label>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{formData.tons || 'N/A'}</p>
                        </div>
                    </div>

                    {/* HPA Amount Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Rate per Tonne (₹)
                            </label>
                            <input
                                type="number"
                                name="rate_per_tonne"
                                value={formData.rate_per_tonne}
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

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Lorry Hire (₹) <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                name="lorry_hire_rs"
                                value={formData.lorry_hire_rs}
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
                    </div>

                    {/* Less Deductions Section */}
                    <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>Less Deductions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Less Advance (₹)
                                </label>
                                <input
                                    type="number"
                                    name="advance_paid_rs"
                                    value={formData.advance_paid_rs}
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Diesel Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    name="diesel_amount"
                                    value={formData.diesel_amount}
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Pump Name
                                </label>
                                <input
                                    type="text"
                                    name="pump_name"
                                    value={formData.pump_name}
                                    onChange={handleChange}
                                    placeholder="Enter pump name"
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Bank Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    name="bank_amount"
                                    value={formData.bank_amount}
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

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                    Any Other Charges (₹)
                                </label>
                                <input
                                    type="number"
                                    name="other_deductions"
                                    value={formData.other_deductions}
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
                    </div>

                    {/* Summary Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                            <p style={{ fontSize: '12px', color: '#92400e', margin: '0 0 8px 0', fontWeight: 600 }}>Total Deductions</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                ₹{calculatedValues.totalDeductions.toLocaleString()}
                            </p>
                        </div>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                            <p style={{ fontSize: '12px', color: '#1e40af', margin: '0 0 8px 0', fontWeight: 600 }}>Lorry Hire</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                ₹{calculatedValues.lorryHire.toLocaleString()}
                            </p>
                        </div>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: '12px', border: '2px solid #10b981' }}>
                            <p style={{ fontSize: '12px', color: '#065f46', margin: '0 0 8px 0', fontWeight: 600 }}>Balance Amount</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                ₹{calculatedValues.balanceRs.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Notes and Remarks */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                                Notes
                            </label>
                            <textarea
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                rows="4"
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

                        <div>
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
                            {isLoading ? 'Updating...' : 'Update HPA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AcknowledgeDeliveryModal({ hpa, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        branch: hpa.branch || '',
        lr: hpa.lr || '',
        hpa: hpa.id,
        pod_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_time: '',
        delivered_to: '',
        delivered_to_phone: '',
        delivery_signature: '',
        quantity_received_mt: hpa.tons || '',
        number_of_bags_received: '',
        goods_condition: 'GOOD',
        status: 'RECEIVED',
        delivery_remarks: '',
        consignee_remarks: '',
        remarks: '',
        pod_document: null,
    });

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            setFormData({ ...formData, pod_document: e.target.files[0] });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value === null || value === '' || typeof value === 'undefined') {
                return;
            }
            if (key === 'pod_document') {
                if (value) submitData.append(key, value);
                return;
            }
            submitData.append(key, value);
        });
        onSubmit(submitData);
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
                    maxWidth: '820px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Acknowledge Delivery - {hpa.hpa_number}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <div style={{
                    padding: '12px 16px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                        LR: <strong>{hpa.lr_number || 'N/A'}</strong> • Truck: <strong>{hpa.truck_number || 'N/A'}</strong>
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#0c4a6e' }}>
                        This will mark the linked LR as <strong>DELIVERED</strong>.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Delivery Date *
                            </label>
                            <input type="date" name="delivery_date" className="input" required onChange={handleChange} value={formData.delivery_date} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Delivery Time
                            </label>
                            <input type="time" name="delivery_time" className="input" onChange={handleChange} value={formData.delivery_time} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Delivered To (Name) *
                            </label>
                            <input type="text" name="delivered_to" className="input" required onChange={handleChange} value={formData.delivered_to} placeholder="Name of receiver" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Receiver Phone
                            </label>
                            <input type="tel" name="delivered_to_phone" className="input" onChange={handleChange} value={formData.delivered_to_phone} placeholder="Optional" />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Delivery Signature
                            </label>
                            <input type="text" name="delivery_signature" className="input" onChange={handleChange} value={formData.delivery_signature} placeholder="Signature of receiver" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Quantity Received (MT)
                            </label>
                            <input type="number" step="0.01" name="quantity_received_mt" className="input" onChange={handleChange} value={formData.quantity_received_mt} placeholder="Optional" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Number of Bags Received
                            </label>
                            <input type="number" name="number_of_bags_received" className="input" onChange={handleChange} value={formData.number_of_bags_received} placeholder="Optional" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Goods Condition
                            </label>
                            <select name="goods_condition" className="input" onChange={handleChange} value={formData.goods_condition}>
                                <option value="GOOD">Good Condition</option>
                                <option value="DAMAGED">Damaged</option>
                                <option value="SHORT">Short Delivery</option>
                                <option value="EXCESS">Excess Delivery</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Status
                            </label>
                            <select name="status" className="input" onChange={handleChange} value={formData.status}>
                                <option value="RECEIVED">Received</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="DISPUTED">Disputed</option>
                                <option value="ACCEPTED">Accepted</option>
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                POD Document (Photo/Scan)
                            </label>
                            <input type="file" name="pod_document" className="input" accept="image/*,.pdf" onChange={handleChange} />
                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Upload delivery acknowledgment (optional)</p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Delivery Remarks
                            </label>
                            <textarea name="delivery_remarks" className="input" onChange={handleChange} value={formData.delivery_remarks} rows="2" placeholder="Delivery remarks..." />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Consignee Remarks
                            </label>
                            <textarea name="consignee_remarks" className="input" onChange={handleChange} value={formData.consignee_remarks} rows="2" placeholder="Remarks from consignee..." />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Internal Remarks
                            </label>
                            <textarea name="remarks" className="input" onChange={handleChange} value={formData.remarks} rows="2" placeholder="Internal remarks..." />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !formData.lr || !formData.branch}>
                            {isLoading ? 'Submitting...' : 'Acknowledge Delivery'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Transactions Modal Component
function TransactionsModal({ hpa, onClose }) {
    const { data: transactionsData, isLoading: isLoadingTransactions } = useGetHPATransactionsQuery(hpa.id);
    const [addTransaction, { isLoading: isAdding }] = useAddHPATransactionMutation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        transaction_type: 'ADVANCE',
        amount: '',
        payment_mode: 'CASH',
        description: '',
        pump_name: '',
        transaction_date: new Date().toISOString().split('T')[0],
    });

    const transactions = transactionsData?.transactions || [];

    // Debug: Log what we received
    console.log('🔍 TransactionsModal Debug:', {
        transactionsData,
        parsedTransactions: transactions,
        length: transactions.length,
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addTransaction({ hpaId: hpa.id, ...formData }).unwrap();
            alert('✅ Transaction added successfully!');
            setFormData({
                transaction_type: 'ADVANCE',
                amount: '',
                payment_mode: 'CASH',
                description: '',
                pump_name: '',
                transaction_date: new Date().toISOString().split('T')[0],
            });
            setShowAddForm(false);
            // RTK Query will automatically refetch due to invalidatesTags
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Error adding transaction: ' + (error.data?.detail || error.message || 'Unknown error'));
        }
    };

    const getTransactionTypeBadge = (type) => {
        const badges = {
            'ADVANCE': { class: 'badge-info', label: 'Advance' },
            'DIESEL': { class: 'badge-warning', label: 'Diesel' },
            'BANK': { class: 'badge-success', label: 'Bank' },
            'EXTRA': { class: 'badge-error', label: 'Extra' },
            'OTHER': { class: 'badge-secondary', label: 'Other' },
        };
        return badges[type] || badges['OTHER'];
    };

    // Calculate totals by type
    const totals = transactions.reduce((acc, t) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + parseFloat(t.amount || 0);
        acc.total += parseFloat(t.amount || 0);
        return acc;
    }, { ADVANCE: 0, DIESEL: 0, BANK: 0, EXTRA: 0, OTHER: 0, total: 0 });

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
                    maxWidth: '1000px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>HPA Transactions</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            HPA #{hpa.hpa_number} - Track all advances, diesel, bank, and extra expenses
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* Transaction Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                        <p style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 600 }}>Total Advance</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.ADVANCE.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                        <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px', fontWeight: 600 }}>Total Diesel</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.DIESEL.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: '12px', border: '2px solid #10b981' }}>
                        <p style={{ fontSize: '11px', color: '#065f46', marginBottom: '4px', fontWeight: 600 }}>Total Bank</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.BANK.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', borderRadius: '12px', border: '2px solid #ef4444' }}>
                        <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px', fontWeight: 600 }}>Extras/Other</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{(totals.EXTRA + totals.OTHER).toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: '12px', border: '2px solid #6366f1' }}>
                        <p style={{ fontSize: '11px', color: '#3730a3', marginBottom: '4px', fontWeight: 600 }}>Remaining Balance</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{((parseFloat(hpa.balance_rs) || 0) - totals.total).toLocaleString()}</p>
                    </div>
                </div>

                {/* Debug Info - Transaction Count */}
                <div style={{ marginBottom: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px', fontSize: '12px', color: '#92400e', border: '2px solid #f59e0b' }}>
                    <strong>📊 Debug Info:</strong><br/>
                    API Response Type: {typeof transactionsData === 'object' ? 'Object' : typeof transactionsData}<br/>
                    Transactions Found: <strong>{transactions.length}</strong><br/>
                    Has "transactions" field: {transactionsData?.transactions ? '✅ Yes' : '❌ No'}<br/>
                    Has "results" field: {transactionsData?.results ? '✅ Yes' : '❌ No'}<br/>
                    Loading: {isLoadingTransactions ? '🔄 Yes' : '✅ No'}<br/>
                    Raw Data Keys: {transactionsData ? Object.keys(transactionsData).join(', ') : 'null'}
                </div>

                {/* Add Transaction Button */}
                {!showAddForm && (
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowAddForm(true)}
                        style={{ marginBottom: '20px', width: '100%' }}
                    >
                        <PlusIcon style={{ width: '20px', height: '20px' }} />
                        Add New Transaction
                    </button>
                )}

                {/* Add Transaction Form */}
                {showAddForm && (
                    <div style={{ marginBottom: '24px', padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Add New Transaction</h3>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Transaction Type *
                                    </label>
                                    <select name="transaction_type" className="input" required onChange={handleChange} value={formData.transaction_type}>
                                        <option value="ADVANCE">Advance Payment</option>
                                        <option value="DIESEL">Diesel</option>
                                        <option value="BANK">Bank</option>
                                        <option value="EXTRA">Extra Charges</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Amount (₹) *
                                    </label>
                                    <input type="number" step="0.01" name="amount" className="input" required onChange={handleChange} value={formData.amount} placeholder="0.00" />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Payment Mode
                                    </label>
                                    <select name="payment_mode" className="input" onChange={handleChange} value={formData.payment_mode}>
                                        <option value="CASH">Cash</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="NEFT">NEFT</option>
                                        <option value="RTGS">RTGS</option>
                                        <option value="IMPS">IMPS</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Date *
                                    </label>
                                    <input type="date" name="transaction_date" className="input" required onChange={handleChange} value={formData.transaction_date} />
                                </div>

                                {formData.transaction_type === 'DIESEL' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                            Pump Name
                                        </label>
                                        <input type="text" name="pump_name" className="input" onChange={handleChange} value={formData.pump_name} placeholder="e.g., Shyamkey" />
                                    </div>
                                )}

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Description
                                    </label>
                                    <textarea name="description" className="input" onChange={handleChange} value={formData.description} rows="2" placeholder="Transaction details..." />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isAdding}>
                                    {isAdding ? 'Adding...' : 'Add Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Transactions List */}
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>All Transactions</h3>
                    {isLoadingTransactions ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading transactions...</div>
                    ) : transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px' }}>
                            No transactions yet. Add the first transaction!
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Type</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Payment Mode</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Description</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Pump Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction, index) => {
                                        const badge = getTransactionTypeBadge(transaction.transaction_type);
                                        return (
                                            <tr
                                                key={transaction.id}
                                                style={{ borderBottom: index < transactions.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                            >
                                                <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                    {transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                                                </td>
                                                <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                                    ₹{parseFloat(transaction.amount || 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                    {transaction.payment_mode || '-'}
                                                </td>
                                                <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                    {transaction.description || '-'}
                                                </td>
                                                <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                                    {transaction.pump_name || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                        <td colSpan="2" style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                            Total Transactions
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '16px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                                            ₹{totals.total.toLocaleString()}
                                        </td>
                                        <td colSpan="3"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// View HPA Modal Component
function ViewHPAModal({ hpa, onClose }) {
    const { data: transactionsData, isLoading: isLoadingTransactions } = useGetHPATransactionsQuery(hpa.id);
    const transactions = transactionsData?.transactions || [];
    
    // Phase 1: Invoice Management
    const { data: invoicesData, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useGetHPAInvoicesQuery(hpa.id);
    const [addInvoice, { isLoading: isAddingInvoice }] = useAddHPAInvoiceMutation();
    const [deleteInvoice, { isLoading: isDeletingInvoice }] = useDeleteHPAInvoiceMutation();
    const [showAddInvoiceForm, setShowAddInvoiceForm] = useState(false);
    const [newInvoice, setNewInvoice] = useState({ invoice_number: '', invoice_date: '', amount: '', remarks: '' });
    
    const invoices = invoicesData?.invoices || [];
    const invoiceTotalAmount = invoicesData?.total_amount || 0;
    
    const handleAddInvoice = async (e) => {
        e.preventDefault();
        try {
            await addInvoice({ 
                hpaId: hpa.id, 
                ...newInvoice,
                amount: newInvoice.amount ? parseFloat(newInvoice.amount) : 0
            }).unwrap();
            setNewInvoice({ invoice_number: '', invoice_date: '', amount: '', remarks: '' });
            setShowAddInvoiceForm(false);
            refetchInvoices();
        } catch (error) {
            alert('Failed to add invoice: ' + (error.data?.invoice_number || error.message || 'Unknown error'));
        }
    };
    
    const handleDeleteInvoice = async (invoiceId, invoiceNumber) => {
        if (window.confirm(`Delete invoice ${invoiceNumber}?`)) {
            try {
                await deleteInvoice({ hpaId: hpa.id, invoiceId }).unwrap();
                refetchInvoices();
            } catch (error) {
                alert('Failed to delete invoice: ' + (error.message || 'Unknown error'));
            }
        }
    };

    const getTransactionTypeBadge = (type) => {
        const badges = {
            'ADVANCE': { class: 'badge-info', label: 'Advance' },
            'DIESEL': { class: 'badge-warning', label: 'Diesel' },
            'BANK': { class: 'badge-success', label: 'Bank' },
            'EXTRA': { class: 'badge-error', label: 'Extra' },
            'OTHER': { class: 'badge-secondary', label: 'Other' },
        };
        return badges[type] || badges['OTHER'];
    };

    // Calculate transaction totals
    const totals = transactions.reduce((acc, t) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + parseFloat(t.amount || 0);
        acc.total += parseFloat(t.amount || 0);
        return acc;
    }, { ADVANCE: 0, DIESEL: 0, BANK: 0, EXTRA: 0, OTHER: 0, total: 0 });

    const remainingBalance = (parseFloat(hpa.lorry_hire_rs) || 0) - (parseFloat(hpa.total_deductions) || 0) - totals.total;

    const downloadTransactionReport = () => {
        let csv = 'Transaction Report - HPA #' + hpa.hpa_number + '\n';
        csv += 'Generated Date: ' + new Date().toLocaleString() + '\n\n';
        csv += 'HPA Details\n';
        csv += 'LR Number,' + hpa.lr_number + '\n';
        csv += 'Truck Number,' + hpa.truck_number + '\n';
        csv += 'Lorry Hire (₹),' + parseFloat(hpa.lorry_hire_rs || 0).toLocaleString() + '\n';
        csv += 'Deductions (₹),-' + parseFloat(hpa.total_deductions || 0).toLocaleString() + '\n\n';
        csv += 'Transaction History\n';
        csv += 'Date,Type,Amount,Payment Mode,Description\n';
        
        transactions.forEach(t => {
            csv += `"${t.transaction_date}","${t.transaction_type}","${t.amount}","${t.payment_mode || '-'}","${t.description || ''}"\n`;
        });
        
        csv += '\nTransaction Totals\n';
        csv += 'Advance (₹),' + totals.ADVANCE + '\n';
        csv += 'Diesel (₹),' + totals.DIESEL + '\n';
        csv += 'Bank (₹),' + totals.BANK + '\n';
        csv += 'Extra (₹),' + totals.EXTRA + '\n';
        csv += 'Other (₹),' + totals.OTHER + '\n';
        csv += 'Total Transactions (₹),' + totals.total + '\n';
        csv += 'Remaining Balance (₹),' + remainingBalance + '\n';
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HPA_${hpa.hpa_number}_Transactions.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
                    maxWidth: '1000px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>HPA View - {hpa.hpa_number}</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            LR: {hpa.lr_number} | Truck: {hpa.truck_number} | Date: {new Date(hpa.hpa_date).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* HPA Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '12px', border: '2px solid #0284c7' }}>
                        <p style={{ fontSize: '11px', color: '#0c4a6e', marginBottom: '4px', fontWeight: 600 }}>Lorry Hire Amount</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{parseFloat(hpa.lorry_hire_rs || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                        <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px', fontWeight: 600 }}>Initial Deductions</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>-₹{parseFloat(hpa.total_deductions || 0).toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '12px', border: '2px solid #ef4444' }}>
                        <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px', fontWeight: 600 }}>Additional Payments</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>-₹{totals.total.toLocaleString()}</p>
                    </div>
                    <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                        <p style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: 600 }}>Remaining Balance</p>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>₹{remainingBalance.toLocaleString()}</p>
                    </div>
                </div>

                {/* Invoice Numbers Section - Phase 1 */}
                <div style={{ marginBottom: '32px', padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '2px solid #22c55e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#166534' }}>
                            Invoice Numbers ({invoices.length + (hpa.invoice_number && !invoices.some(i => i.invoice_number === hpa.invoice_number) ? 1 : 0)})
                        </h3>
                        <button
                            onClick={() => setShowAddInvoiceForm(!showAddInvoiceForm)}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <PlusIcon style={{ width: '16px', height: '16px' }} />
                            Add Invoice
                        </button>
                    </div>
                    
                    {/* Add Invoice Form */}
                    {showAddInvoiceForm && (
                        <form onSubmit={handleAddInvoice} style={{ marginBottom: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #86efac' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Invoice Number *</label>
                                    <input
                                        type="text"
                                        value={newInvoice.invoice_number}
                                        onChange={(e) => setNewInvoice(prev => ({ ...prev, invoice_number: e.target.value }))}
                                        placeholder="e.g., INV-2024-001"
                                        required
                                        className="input"
                                        style={{ fontSize: '13px', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Invoice Date</label>
                                    <input
                                        type="date"
                                        value={newInvoice.invoice_date}
                                        onChange={(e) => setNewInvoice(prev => ({ ...prev, invoice_date: e.target.value }))}
                                        className="input"
                                        style={{ fontSize: '13px', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Amount</label>
                                    <input
                                        type="number"
                                        value={newInvoice.amount}
                                        onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="input"
                                        style={{ fontSize: '13px', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Remarks</label>
                                    <input
                                        type="text"
                                        value={newInvoice.remarks}
                                        onChange={(e) => setNewInvoice(prev => ({ ...prev, remarks: e.target.value }))}
                                        placeholder="Optional"
                                        className="input"
                                        style={{ fontSize: '13px', padding: '8px' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowAddInvoiceForm(false)} style={{ padding: '6px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }} disabled={isAddingInvoice}>
                                    {isAddingInvoice ? 'Adding...' : 'Add Invoice'}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {/* Invoice List */}
                    {isLoadingInvoices ? (
                        <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>Loading invoices...</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {/* Show legacy invoice_number if set */}
                            {hpa.invoice_number && !invoices.some(i => i.invoice_number === hpa.invoice_number) && (
                                <div style={{ padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 600, color: '#166534' }}>{hpa.invoice_number}</span>
                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>(Legacy)</span>
                                </div>
                            )}
                            {invoices.map(invoice => (
                                <div key={invoice.id} style={{ padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, color: '#166534' }}>{invoice.invoice_number}</span>
                                        {invoice.amount > 0 && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>₹{parseFloat(invoice.amount).toLocaleString()}</span>}
                                        {invoice.invoice_date && <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>{invoice.invoice_date}</span>}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                                        style={{ padding: '2px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                        title="Delete invoice"
                                        disabled={isDeletingInvoice}
                                    >
                                        <XMarkIcon style={{ width: '14px', height: '14px' }} />
                                    </button>
                                </div>
                            ))}
                            {invoices.length === 0 && !hpa.invoice_number && (
                                <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>No invoices added yet. Click "Add Invoice" to add one.</p>
                            )}
                        </div>
                    )}
                    {invoiceTotalAmount > 0 && (
                        <p style={{ fontSize: '13px', color: '#166534', marginTop: '12px', fontWeight: 600 }}>
                            Total Invoice Amount: ₹{invoiceTotalAmount.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Initial Deductions Breakdown */}
                <div style={{ marginBottom: '32px', padding: '24px', background: '#fef3c7', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#92400e' }}>
                        Initial Deductions Breakdown (Entered at HPA Creation)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {parseFloat(hpa.advance_paid_rs || 0) > 0 && (
                            <div style={{ padding: '12px', background: 'white', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Advance Paid</p>
                                <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{parseFloat(hpa.advance_paid_rs || 0).toLocaleString()}</p>
                            </div>
                        )}
                        {parseFloat(hpa.diesel_amount || 0) > 0 && (
                            <div style={{ padding: '12px', background: 'white', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Diesel Amount</p>
                                <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{parseFloat(hpa.diesel_amount || 0).toLocaleString()}</p>
                                {hpa.pump_name && <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Pump: {hpa.pump_name}</p>}
                            </div>
                        )}
                        {parseFloat(hpa.bank_amount || 0) > 0 && (
                            <div style={{ padding: '12px', background: 'white', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Bank Amount</p>
                                <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{parseFloat(hpa.bank_amount || 0).toLocaleString()}</p>
                            </div>
                        )}
                        {parseFloat(hpa.other_deductions || 0) > 0 && (
                            <div style={{ padding: '12px', background: 'white', borderRadius: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Other Charges</p>
                                <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{parseFloat(hpa.other_deductions || 0).toLocaleString()}</p>
                                {hpa.other_deductions_description && <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{hpa.other_deductions_description}</p>}
                            </div>
                        )}
                    </div>
                    {parseFloat(hpa.total_deductions || 0) === 0 && (
                        <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>No initial deductions were entered for this HPA</p>
                    )}
                </div>

                {/* Download Button */}
                <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={downloadTransactionReport}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ArrowDownTrayIcon style={{ width: '18px', height: '18px' }} />
                        Download Transactions Report
                    </button>
                </div>

                {/* Transactions List */}
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Additional Payment Transactions</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                    Payments made after HPA creation to settle the remaining balance
                </p>
                {isLoadingTransactions ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        Loading transactions...
                    </div>
                ) : transactions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        No transactions recorded for this HPA
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Type</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Payment Mode</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(transaction => {
                                    const badge = getTransactionTypeBadge(transaction.transaction_type);
                                    return (
                                        <tr key={transaction.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '16px 12px', fontSize: '14px' }}>{transaction.transaction_date}</td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <span className={badge.class}>{badge.label}</span>
                                            </td>
                                            <td style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>₹{parseFloat(transaction.amount).toLocaleString()}</td>
                                            <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{transaction.payment_mode || '-'}</td>
                                            <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{transaction.description || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                                <tr>
                                    <td colSpan="2" style={{ padding: '16px 12px', fontWeight: 700, color: '#111827' }}>Total Transactions</td>
                                    <td style={{ padding: '16px 12px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>₹{totals.total.toLocaleString()}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Close Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
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
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}