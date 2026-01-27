import { useState, useEffect } from 'react';
import { 
    useGetLRsQuery, 
    useCreateLRMutation, 
    useUpdateLRMutation,
    useGetLRItemsByLRQuery,
    useCreateLRItemMutation,
    useUpdateLRItemMutation,
    useDeleteLRItemMutation
} from '../features/lr/lrApi';
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
import { DocumentTextIcon, XMarkIcon, PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PencilIcon, EyeIcon, ShareIcon, TrashIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchableSelect } from '../hooks/useSearchableSelect';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import CreateMultipleLRsModal from './CreateMultipleLRsModal';

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
                    Create LR
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
                                                            const blobUrl = window.URL.createObjectURL(blob);
                                                            window.open(blobUrl, '_blank');
                                                            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
                                                        })
                                                        .catch(error => {
                                                            console.error('Error viewing PDF:', error);
                                                            alert('Error viewing PDF. Please try again.');
                                                        });
                                                    }}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                    title="View LR PDF"
                                                >
                                                    <EyeIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
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
                                                            const blobUrl = window.URL.createObjectURL(blob);
                                                            const message = `LR ${lr.lr_number} - Click to view: ${blobUrl}`;
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
                <CreateMultipleLRsModal
                    branches={branches || []}
                    trucks={trucks || []}
                    consignors={consignors || []}
                    parties={parties || []}
                    onClose={() => setShowCreateModal(false)}
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

    // LR Container Data (truck, driver, dates, status)
    const [lrContainerData, setLrContainerData] = useState({
        branch: defaultBranchId,
        truck: '',
        lr_date: new Date().toISOString().split('T')[0],
        driver_name: '',
        driver_phone: '',
        driver_license_no: '',
        status: 'DRAFT',
        expected_loading_date: '',
        expected_delivery_date: '',
        remarks: '',
    });

    // LR Items (Orders) - Multiple items per LR
    const [lrItems, setLrItems] = useState([
        {
        consignor: '',
        consignee: '',
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
            sap_number: '',
        payment_term: 'TO_BE_BILLED',
        gst_payable_by: 'SERVICE',
        }
    ]);

    const [selectedTruck, setSelectedTruck] = useState(null);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showTruckModal, setShowTruckModal] = useState(false);
    const [showConsignorModal, setShowConsignorModal] = useState(false);
    const [showPartyModal, setShowPartyModal] = useState(false);

    // Auto-populate driver details from truck when truck is selected
    const handleTruckChange = (e) => {
        const truckId = e.target.value;
        const truck = trucks.find(t => t.id === parseInt(truckId));
        setSelectedTruck(truck);
        setLrContainerData({
            ...lrContainerData,
            truck: truckId,
            driver_name: truck?.driver_name || lrContainerData.driver_name,
            driver_phone: truck?.driver_phone || lrContainerData.driver_phone,
            driver_license_no: truck?.driver_license_no || lrContainerData.driver_license_no,
        });
    };

    // Handle container field changes
    const handleContainerChange = (e) => {
        const { name, value } = e.target;
        setLrContainerData({ ...lrContainerData, [name]: value });
    };

    // Handle item field changes
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...lrItems];
        updatedItems[index][field] = value;
        setLrItems(updatedItems);
    };

    // Add new item
    const handleAddItem = () => {
        setLrItems([...lrItems, {
            consignor: '',
            consignee: '',
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
            sap_number: '',
            payment_term: 'TO_BE_BILLED',
            gst_payable_by: 'SERVICE',
        }]);
    };

    // Remove item
    const handleRemoveItem = (index) => {
        if (lrItems.length > 1) {
            setLrItems(lrItems.filter((_, i) => i !== index));
        } else {
            alert('LR must have at least one item');
        }
    };

    // Calculate totals
    const totalQuantity = lrItems.reduce((sum, item) => 
        sum + parseFloat(item.quantity_mt || 0), 0
    );
    const totalBags = lrItems.reduce((sum, item) => 
        sum + parseInt(item.number_of_bags || 0), 0
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate at least one item
        if (lrItems.length === 0) {
            alert('Please add at least one LR item');
            return;
        }

        // Validate required fields for each item
        const invalidItems = lrItems.filter(item => 
            !item.consignor || !item.consignee || !item.from_location || 
            !item.to_location || !item.quantity_mt
        );

        if (invalidItems.length > 0) {
            alert('Please fill all required fields for all items (Consignor, Consignee, From, To, Quantity)');
            return;
        }

        // Prepare container data
        const cleanedContainerData = { ...lrContainerData };

        // Branch managers: Remove branch field (backend auto-assigns from user.branch)
        if (!isSuperAdmin) {
            delete cleanedContainerData.branch;
        }

        // Remove empty optional fields from container
        const optionalContainerFields = ['expected_loading_date', 'expected_delivery_date', 'remarks'];
        optionalContainerFields.forEach(field => {
            if (!cleanedContainerData[field] || cleanedContainerData[field] === '') {
                delete cleanedContainerData[field];
            }
        });

        // Prepare items data
        const cleanedItems = lrItems.map((item, index) => {
            const cleanedItem = { ...item };
            
            // Convert number fields
            if (cleanedItem.quantity_mt) cleanedItem.quantity_mt = parseFloat(cleanedItem.quantity_mt);
            if (cleanedItem.number_of_bags) cleanedItem.number_of_bags = parseInt(cleanedItem.number_of_bags);
            if (cleanedItem.number_of_loads) cleanedItem.number_of_loads = parseInt(cleanedItem.number_of_loads);

        // Remove empty optional fields
            const optionalItemFields = [
                'destination', 'delivery_at', 'grade', 'grade_quantity',
                'loading_from_department', 'please_load', 'number_of_loads',
                'grade_type_of_pkg', 'sap_number', 'gst_payable_by'
            ];
            
            optionalItemFields.forEach(field => {
                if (!cleanedItem[field] || cleanedItem[field] === '') {
                    delete cleanedItem[field];
                }
            });

            return cleanedItem;
        });

        // Combine container and items
        const formData = {
            ...cleanedContainerData,
            lr_items: cleanedItems
        };

        onSubmit(formData);
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
                        maxWidth: '1400px',
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
                        {/* SECTION 1: LR Container Details */}
                        <div style={{ 
                            marginBottom: '32px',
                            paddingBottom: '24px',
                            borderBottom: '2px solid #e5e7eb'
                        }}>
                            <h3 style={{ 
                                fontSize: '18px', 
                                fontWeight: 600, 
                                marginBottom: '20px',
                                color: '#374151'
                            }}>
                                LR Container Details
                            </h3>
                            
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
                                            value={lrContainerData.branch}
                                            onChange={handleContainerChange}
                                        placeholder="Search branch by name/code"
                                        label={null}
                                        name="branch"
                                        required
                                        getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>
                            )}
                            
                            {/* Truck */}
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={trucks}
                                            onSearch={truckSearch.searchFunction}
                                                value={lrContainerData.truck}
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

                                {/* LR Date */}
                            <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        LR Date *
                                    </label>
                                    <input type="date" name="lr_date" className="input" required onChange={handleContainerChange} value={lrContainerData.lr_date} />
                                </div>

                                {/* Driver Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Driver Name *
                                    </label>
                                    <input type="text" name="driver_name" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_name} placeholder="Nitin" />
                                </div>

                                {/* Driver Phone */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Driver Mobile *
                                    </label>
                                    <input type="tel" name="driver_phone" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_phone} placeholder="9075051501" />
                                </div>

                                {/* Driver License */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Driver License No. *
                                    </label>
                                    <input type="text" name="driver_license_no" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_license_no} placeholder="MH13233" />
                                </div>

                                {/* Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Status *
                                    </label>
                                    <select name="status" className="input" required onChange={handleContainerChange} value={lrContainerData.status}>
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
                                    <input type="date" name="expected_loading_date" className="input" onChange={handleContainerChange} value={lrContainerData.expected_loading_date} />
                                </div>

                                {/* Expected Delivery Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Expected Delivery Date
                                    </label>
                                    <input type="date" name="expected_delivery_date" className="input" onChange={handleContainerChange} value={lrContainerData.expected_delivery_date} />
                                </div>

                                {/* Remarks */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                        Remarks
                                    </label>
                                    <textarea name="remarks" className="input" onChange={handleContainerChange} value={lrContainerData.remarks} rows="2" placeholder="Any additional notes..." />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: LR Items (Orders) */}
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '16px'
                            }}>
                                <h3 style={{ 
                                    fontSize: '18px', 
                                    fontWeight: 600,
                                    color: '#374151'
                                }}>
                                    LR Items (Orders)
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="btn btn-primary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px'
                                    }}
                                >
                                    <PlusIcon style={{ width: '18px', height: '18px' }} />
                                    Add Order
                                </button>
                            </div>

                            {/* Items Table */}
                            <div style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                background: 'white'
                            }}>
                                {/* Table Header */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: '#f9fafb',
                                    borderBottom: '2px solid #e5e7eb',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    color: '#374151'
                                }}>
                                    <div>#</div>
                                    <div>Consignor *</div>
                                    <div>Consignee *</div>
                                    <div>From *</div>
                                    <div>To *</div>
                                    <div>Qty (MT) *</div>
                                    <div>Bags</div>
                                    <div>Material</div>
                                    <div></div>
                                </div>

                                {/* Table Body - Scrollable */}
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {lrItems.map((item, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                borderBottom: index < lrItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                alignItems: 'center',
                                                background: index % 2 === 0 ? 'white' : '#fafafa'
                                            }}
                                        >
                                            {/* Row Number */}
                                            <div style={{
                                                fontWeight: 600,
                                                color: '#6b7280',
                                                fontSize: '14px',
                                                textAlign: 'center'
                                            }}>
                                                {index + 1}
                                            </div>

                                            {/* Consignor */}
                                            <div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={consignors}
                                            onSearch={consignorSearch.searchFunction}
                                                            value={item.consignor}
                                                            onChange={(e) => handleItemChange(index, 'consignor', e.target.value)}
                                                            placeholder="Select..."
                                                            label={null}
                                                            name={`consignor_${index}`}
                                            required
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setShowConsignorModal(true)}
                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 8px', minWidth: 'auto', height: '36px' }}
                                            title="Add New Consignor"
                                        >
                                                            <PlusIcon style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                                            {/* Consignee */}
                            <div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect
                                            options={parties}
                                            onSearch={partySearch.searchFunction}
                                                            value={item.consignee}
                                                            onChange={(e) => handleItemChange(index, 'consignee', e.target.value)}
                                                            placeholder="Select..."
                                                            label={null}
                                                            name={`consignee_${index}`}
                                            required
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPartyModal(true)}
                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 8px', minWidth: 'auto', height: '36px' }}
                                            title="Add New Party"
                                        >
                                                            <PlusIcon style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* From Location */}
                            <div>
                                                <input
                                                    type="text"
                                                    value={item.from_location}
                                                    onChange={(e) => handleItemChange(index, 'from_location', e.target.value)}
                                                    placeholder="Mumbai"
                                                    required
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                            </div>

                            {/* To Location */}
                            <div>
                                                <input
                                                    type="text"
                                                    value={item.to_location}
                                                    onChange={(e) => handleItemChange(index, 'to_location', e.target.value)}
                                                    placeholder="Bangalore"
                                                    required
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                            </div>

                            {/* Quantity (MT) */}
                            <div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.quantity_mt}
                                                    onChange={(e) => handleItemChange(index, 'quantity_mt', e.target.value)}
                                                    placeholder="0.00"
                                                    required
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                            </div>

                            {/* Number of Bags */}
                            <div>
                                                <input
                                                    type="number"
                                                    value={item.number_of_bags}
                                                    onChange={(e) => handleItemChange(index, 'number_of_bags', e.target.value)}
                                                    placeholder="0"
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                            </div>

                                            {/* Material Description */}
                            <div>
                                                <input
                                                    type="text"
                                                    value={item.material_description}
                                                    onChange={(e) => handleItemChange(index, 'material_description', e.target.value)}
                                                    placeholder="Cement, Electronics..."
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                            </div>

                                            {/* Delete Button */}
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                {lrItems.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: '#ef4444',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Remove this order"
                                                    >
                                                        <XMarkIcon style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                ) : (
                                                    <div style={{ width: '18px', height: '18px' }} />
                                                )}
                            </div>
                            </div>
                                    ))}
                            </div>

                                {/* Totals Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: '#fef3c7',
                                    borderTop: '2px solid #fbbf24',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    color: '#92400e'
                                }}>
                                    <div style={{ textAlign: 'center' }}>TOTAL</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div style={{ textAlign: 'right' }}>{totalQuantity.toFixed(2)}</div>
                                    <div style={{ textAlign: 'right' }}>{totalBags}</div>
                                    <div>-</div>
                                    <div></div>
                            </div>
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
    const { isSuperAdmin } = useAuth();
    const truckSearch = useSearchableSelect('/masters/trucks/');
    const consignorSearch = useSearchableSelect('/masters/consignors/');
    const partySearch = useSearchableSelect('/masters/parties/');

    // Load existing items
    const { data: lrItemsData, refetch: refetchItems } = useGetLRItemsByLRQuery(lr.id);
    const existingItems = lrItemsData || [];
    
    // Check if can edit items
    const canEditItems = lr.status === 'DRAFT' || lr.status === 'PENDING_HPA';

    // LR Container Data
    const [lrContainerData, setLrContainerData] = useState({
        truck: lr.truck || '',
        driver_name: lr.driver_name || '',
        driver_phone: lr.driver_phone || '',
        driver_license_no: lr.driver_license_no || '',
        lr_date: lr.lr_date || new Date().toISOString().split('T')[0],
        status: lr.status || 'DRAFT',
        expected_loading_date: lr.expected_loading_date || '',
        expected_delivery_date: lr.expected_delivery_date || '',
        remarks: lr.remarks || '',
    });

    // LR Items - Initialize from existing items or empty
    const [lrItems, setLrItems] = useState(() => {
        if (existingItems.length > 0) {
            return existingItems.map(item => ({
                id: item.id,
                consignor: item.consignor || '',
                consignee: item.consignee || '',
                from_location: item.from_location || '',
                to_location: item.to_location || '',
                destination: item.destination || '',
                delivery_at: item.delivery_at || '',
                material_description: item.material_description || '',
                quantity_mt: item.quantity_mt || '',
                number_of_bags: item.number_of_bags || '',
                grade: item.grade || '',
                grade_quantity: item.grade_quantity || '',
                loading_from_department: item.loading_from_department || 'DISTRIBUTION DEPARTMENT',
                please_load: item.please_load || '',
                number_of_loads: item.number_of_loads || '',
                grade_type_of_pkg: item.grade_type_of_pkg || '',
                sap_number: item.sap_number || '',
                payment_term: item.payment_term || 'TO_BE_BILLED',
                gst_payable_by: item.gst_payable_by || 'SERVICE',
                sequence_number: item.sequence_number || 1,
            }));
        }
        return [];
    });

    // Update items when data loads
    useEffect(() => {
        if (existingItems.length > 0 && lrItems.length === 0) {
            setLrItems(existingItems.map(item => ({
                id: item.id,
                consignor: item.consignor || '',
                consignee: item.consignee || '',
                from_location: item.from_location || '',
                to_location: item.to_location || '',
                destination: item.destination || '',
                delivery_at: item.delivery_at || '',
                material_description: item.material_description || '',
                quantity_mt: item.quantity_mt || '',
                number_of_bags: item.number_of_bags || '',
                grade: item.grade || '',
                grade_quantity: item.grade_quantity || '',
                loading_from_department: item.loading_from_department || 'DISTRIBUTION DEPARTMENT',
                please_load: item.please_load || '',
                number_of_loads: item.number_of_loads || '',
                grade_type_of_pkg: item.grade_type_of_pkg || '',
                sap_number: item.sap_number || '',
                payment_term: item.payment_term || 'TO_BE_BILLED',
                gst_payable_by: item.gst_payable_by || 'SERVICE',
                sequence_number: item.sequence_number || 1,
            })));
        }
    }, [existingItems]);

    const [createLRItem] = useCreateLRItemMutation();
    const [updateLRItem] = useUpdateLRItemMutation();
    const [deleteLRItem] = useDeleteLRItemMutation();
    const [updateLR] = useUpdateLRMutation();

    // Handle container field changes
    const handleContainerChange = (e) => {
        const { name, value } = e.target;
        setLrContainerData({ ...lrContainerData, [name]: value });
    };

    // Handle item field changes
    const handleItemChange = (index, field, value) => {
        const updatedItems = [...lrItems];
        updatedItems[index][field] = value;
        setLrItems(updatedItems);
    };

    // Add new item
    const handleAddItem = async () => {
        if (!canEditItems) {
            alert('Cannot add items. LR status must be DRAFT or PENDING_HPA.');
            return;
        }

        const newItem = {
            consignor: '',
            consignee: '',
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
            sap_number: '',
            payment_term: 'TO_BE_BILLED',
            gst_payable_by: 'SERVICE',
        };

        try {
            const result = await createLRItem({
                lr: lr.id,
                ...newItem
            }).unwrap();
            
            setLrItems([...lrItems, { ...newItem, id: result.id, sequence_number: result.sequence_number }]);
            refetchItems();
        } catch (error) {
            alert('Error adding item: ' + (error.data?.error || error.message || 'Unknown error'));
        }
    };

    // Remove item
    const handleRemoveItem = async (index) => {
        if (!canEditItems) {
            alert('Cannot remove items. LR status must be DRAFT or PENDING_HPA.');
            return;
        }

        if (lrItems.length <= 1) {
            alert('LR must have at least one item');
            return;
        }

        const item = lrItems[index];
        if (item.id) {
            // Existing item - delete from backend
            try {
                await deleteLRItem(item.id).unwrap();
                setLrItems(lrItems.filter((_, i) => i !== index));
                refetchItems();
            } catch (error) {
                alert('Error removing item: ' + (error.data?.error || error.message || 'Unknown error'));
            }
        } else {
            // New item - just remove from state
            setLrItems(lrItems.filter((_, i) => i !== index));
        }
    };

    // Calculate totals
    const totalQuantity = lrItems.reduce((sum, item) => 
        sum + parseFloat(item.quantity_mt || 0), 0
    );
    const totalBags = lrItems.reduce((sum, item) => 
        sum + parseInt(item.number_of_bags || 0), 0
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Update container fields
            await updateLR({ id: lr.id, ...lrContainerData }).unwrap();
            
            // Update all items
            for (const item of lrItems) {
                if (item.id) {
                    // Existing item - update
                    const { id, ...itemData } = item;
                    await updateLRItem({ id, ...itemData }).unwrap();
                } else if (canEditItems) {
                    // New item - create
                    await createLRItem({
                        lr: lr.id,
                        ...item
                    }).unwrap();
                }
            }

            await onSubmit(lrContainerData);
            refetchItems();
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
                    maxWidth: '1400px',
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

                {/* Status Warning */}
                {!canEditItems && (
                    <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '20px',
                        color: '#92400e',
                        fontSize: '14px'
                    }}>
                        ⚠️ Items cannot be edited. LR status is {lr.status}. Only container fields can be updated.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* SECTION 1: LR Container Details */}
                    <div style={{ 
                        marginBottom: '32px',
                        paddingBottom: '24px',
                        borderBottom: '2px solid #e5e7eb'
                    }}>
                        <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: 600, 
                            marginBottom: '20px',
                            color: '#374151'
                        }}>
                            LR Container Details
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        {/* Branch - Read only */}
                        <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
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
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
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

                        {/* Truck */}
                        <div>
                            <SearchableSelect
                                options={trucks}
                                onSearch={truckSearch.searchFunction}
                                    value={lrContainerData.truck}
                                    onChange={handleContainerChange}
                                    placeholder="Search and select truck..."
                                label="Truck"
                                name="truck"
                                required
                                    getOptionLabel={(opt) => opt.truck_number}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>

                            {/* LR Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    LR Date *
                                </label>
                                <input type="date" name="lr_date" className="input" required onChange={handleContainerChange} value={lrContainerData.lr_date} />
                            </div>

                        {/* Driver Name */}
                        <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver Name *
                            </label>
                                <input type="text" name="driver_name" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_name} placeholder="Nitin" />
                        </div>

                            {/* Driver Phone */}
                        <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver Mobile *
                            </label>
                                <input type="tel" name="driver_phone" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_phone} placeholder="9075051501" />
                            </div>

                            {/* Driver License */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Driver License No. *
                                </label>
                                <input type="text" name="driver_license_no" className="input" required onChange={handleContainerChange} value={lrContainerData.driver_license_no} placeholder="MH13233" />
                            </div>

                            {/* Status */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Status *
                                </label>
                                <select name="status" className="input" required onChange={handleContainerChange} value={lrContainerData.status}>
                                    <option value="DRAFT">Draft</option>
                                    <option value="PENDING_HPA">Pending HPA Creation</option>
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
                                <input type="date" name="expected_loading_date" className="input" onChange={handleContainerChange} value={lrContainerData.expected_loading_date} />
                            </div>

                            {/* Expected Delivery Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Expected Delivery Date
                                </label>
                                <input type="date" name="expected_delivery_date" className="input" onChange={handleContainerChange} value={lrContainerData.expected_delivery_date} />
                            </div>

                            {/* Remarks */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Remarks
                                </label>
                                <textarea name="remarks" className="input" onChange={handleContainerChange} value={lrContainerData.remarks} rows="2" placeholder="Any additional notes..." />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: LR Items (Orders) */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{ 
                                fontSize: '18px', 
                                fontWeight: 600,
                                color: '#374151'
                            }}>
                                LR Items (Orders)
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="btn btn-primary"
                                disabled={!canEditItems}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    opacity: canEditItems ? 1 : 0.5,
                                    cursor: canEditItems ? 'pointer' : 'not-allowed'
                                }}
                                title={canEditItems ? 'Add new order' : 'Cannot add items. LR status must be DRAFT or PENDING_HPA.'}
                            >
                                <PlusIcon style={{ width: '18px', height: '18px' }} />
                                Add Order
                            </button>
                        </div>

                        {/* Items Table */}
                        <div style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'white'
                        }}>
                            {/* Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                gap: '12px',
                                padding: '12px 16px',
                                background: '#f9fafb',
                                borderBottom: '2px solid #e5e7eb',
                                fontWeight: 600,
                                fontSize: '13px',
                                color: '#374151'
                            }}>
                                <div>#</div>
                                <div>Consignor *</div>
                                <div>Consignee *</div>
                                <div>From *</div>
                                <div>To *</div>
                                <div>Qty (MT) *</div>
                                <div>Bags</div>
                                <div>Material</div>
                                <div></div>
                            </div>

                            {/* Table Body - Scrollable */}
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {lrItems.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                        No items found. {canEditItems && 'Click "Add Order" to add items.'}
                                    </div>
                                ) : (
                                    lrItems.map((item, index) => (
                                        <div
                                            key={item.id || index}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                borderBottom: index < lrItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                alignItems: 'center',
                                                background: index % 2 === 0 ? 'white' : '#fafafa',
                                                opacity: canEditItems ? 1 : 0.7
                                            }}
                                        >
                                            {/* Row Number */}
                                            <div style={{
                                                fontWeight: 600,
                                                color: '#6b7280',
                                                fontSize: '14px',
                                                textAlign: 'center'
                                            }}>
                                                {item.sequence_number || index + 1}
                        </div>

                        {/* Consignor */}
                        <div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1 }}>
                            <SearchableSelect
                                options={consignors}
                                onSearch={consignorSearch.searchFunction}
                                                            value={item.consignor}
                                                            onChange={(e) => handleItemChange(index, 'consignor', e.target.value)}
                                                            placeholder="Select..."
                                                            label={null}
                                                            name={`consignor_${index}`}
                                                            required
                                                            disabled={!canEditItems}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                                                    </div>
                                                    {isSuperAdmin && canEditItems && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {/* setShowConsignorModal(true) */}}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 8px', minWidth: 'auto', height: '36px' }}
                                                            title="Add New Consignor"
                                                        >
                                                            <PlusIcon style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    )}
                                                </div>
                        </div>

                        {/* Consignee */}
                        <div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                                                    <div style={{ flex: 1 }}>
                            <SearchableSelect
                                options={parties}
                                onSearch={partySearch.searchFunction}
                                                            value={item.consignee}
                                                            onChange={(e) => handleItemChange(index, 'consignee', e.target.value)}
                                                            placeholder="Select..."
                                                            label={null}
                                                            name={`consignee_${index}`}
                                                            required
                                                            disabled={!canEditItems}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                                                    </div>
                                                    {isSuperAdmin && canEditItems && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {/* setShowPartyModal(true) */}}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 8px', minWidth: 'auto', height: '36px' }}
                                                            title="Add New Party"
                                                        >
                                                            <PlusIcon style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    )}
                                                </div>
                        </div>

                                            {/* From Location */}
                        <div>
                            <input
                                                    type="text"
                                                    value={item.from_location}
                                                    onChange={(e) => handleItemChange(index, 'from_location', e.target.value)}
                                                    placeholder="Mumbai"
                                required
                                                    disabled={!canEditItems}
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                            />
                        </div>

                                            {/* To Location */}
                        <div>
                                                <input
                                                    type="text"
                                                    value={item.to_location}
                                                    onChange={(e) => handleItemChange(index, 'to_location', e.target.value)}
                                                    placeholder="Bangalore"
                                                    required
                                                    disabled={!canEditItems}
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                                            </div>

                                            {/* Quantity (MT) */}
                                            <div>
                            <input
                                type="number"
                                                    step="0.01"
                                                    value={item.quantity_mt}
                                                    onChange={(e) => handleItemChange(index, 'quantity_mt', e.target.value)}
                                                    placeholder="0.00"
                                                    required
                                                    disabled={!canEditItems}
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                            />
                        </div>

                                            {/* Number of Bags */}
                        <div>
                            <input
                                                    type="number"
                                                    value={item.number_of_bags}
                                                    onChange={(e) => handleItemChange(index, 'number_of_bags', e.target.value)}
                                                    placeholder="0"
                                                    disabled={!canEditItems}
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                            />
                        </div>

                                            {/* Material Description */}
                        <div>
                            <input
                                type="text"
                                                    value={item.material_description}
                                                    onChange={(e) => handleItemChange(index, 'material_description', e.target.value)}
                                                    placeholder="Cement, Electronics..."
                                                    disabled={!canEditItems}
                                                    className="input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                />
                                            </div>

                                            {/* Delete Button */}
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                {canEditItems && lrItems.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: '#ef4444',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Remove this order"
                                                    >
                                                        <XMarkIcon style={{ width: '18px', height: '18px' }} />
                                                    </button>
                                                ) : (
                                                    <div style={{ width: '18px', height: '18px' }} />
                                                )}
                        </div>
                                        </div>
                                    ))
                                )}
                    </div>

                            {/* Totals Row */}
                            {lrItems.length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '50px 1.2fr 1.2fr 120px 120px 100px 100px 1.5fr 50px',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    background: '#fef3c7',
                                    borderTop: '2px solid #fbbf24',
                                    fontWeight: 600,
                                fontSize: '14px',
                                    color: '#92400e'
                                }}>
                                    <div style={{ textAlign: 'center' }}>TOTAL</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div>-</div>
                                    <div style={{ textAlign: 'right' }}>{totalQuantity.toFixed(2)}</div>
                                    <div style={{ textAlign: 'right' }}>{totalBags}</div>
                                    <div>-</div>
                                    <div></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
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
