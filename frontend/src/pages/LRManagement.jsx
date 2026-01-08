import { useState } from 'react';
import { useGetLRsQuery, useCreateLRMutation, useDeleteLRMutation } from '../features/lr/lrApi';
import {
    useGetBranchesQuery,
    useGetTrucksQuery,
    useGetPartiesQuery,
    useGetCompaniesQuery,
    useCreateBranchMutation,
    useCreateTruckMutation,
    useCreatePartyMutation
} from '../features/masters/mastersApi';
import { DocumentTextIcon, XMarkIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function LRManagement() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});

    const { data: lrsData, isLoading: isLoadingLRs } = useGetLRsQuery(filters);
    const { data: branchesData, isLoading: isLoadingBranches } = useGetBranchesQuery();
    const { data: trucksData, isLoading: isLoadingTrucks } = useGetTrucksQuery();
    const { data: partiesData, isLoading: isLoadingParties } = useGetPartiesQuery();

    const [createLR, { isLoading: isCreating }] = useCreateLRMutation();
    const [deleteLR] = useDeleteLRMutation();

    // Extract arrays from API response - handle both array and paginated object formats
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);
    const trucks = Array.isArray(trucksData) ? trucksData : (trucksData?.results || []);
    const parties = Array.isArray(partiesData) ? partiesData : (partiesData?.results || []);

    console.log('Branches data:', branchesData, 'Extracted:', branches);
    console.log('Trucks data:', trucksData, 'Extracted:', trucks);
    console.log('Parties data:', partiesData, 'Extracted:', parties);

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

    const handleDeleteLR = async (id) => {
        if (window.confirm('Are you sure you want to delete this LR?')) {
            try {
                await deleteLR(id).unwrap();
                alert('LR deleted successfully!');
            } catch (error) {
                alert('Error deleting LR');
            }
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'DELIVERED':
                return 'badge-success';
            case 'IN_TRANSIT':
                return 'badge-warning';
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
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
                            <option value="PENDING">Pending</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
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
                ) : lrsData?.results?.length === 0 || !lrsData?.results ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        No LRs found. Create your first LR!
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Party</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>From → To</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lrsData?.results?.map((lr, index) => (
                                    <tr
                                        key={lr.id}
                                        style={{ borderBottom: index < lrsData.results.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{lr.lr_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{new Date(lr.lr_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.truck_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{lr.party_name}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{lr.from_location} → {lr.to_location}</td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(lr.status)}`}>
                                                {lr.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                            ₹{parseFloat(lr.freight_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteLR(lr.id)}
                                                style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                title="Delete LR"
                                            >
                                                <XMarkIcon style={{ width: '18px', height: '18px' }} />
                                            </button>
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
                    parties={parties || []}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateLR}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

function CreateLRModal({ branches, trucks, parties, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        branch: '',
        truck: '',
        party: '',
        from_location: '',
        to_location: '',
        material_description: '',
        quantity: '',
        weight_in_tons: '',
        freight_amount: '',
        status: 'PENDING',
        invoice_number: '',
        invoice_date: '',
        delivery_date: '',
        remarks: '',
    });

    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showTruckModal, setShowTruckModal] = useState(false);
    const [showPartyModal, setShowPartyModal] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean up the form data - remove empty optional fields
        const cleanedData = { ...formData };

        // Remove empty optional fields
        if (!cleanedData.invoice_number) delete cleanedData.invoice_number;
        if (!cleanedData.invoice_date) delete cleanedData.invoice_date;
        if (!cleanedData.delivery_date) delete cleanedData.delivery_date;
        if (!cleanedData.remarks) delete cleanedData.remarks;

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
                            {/* Branch */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Branch *
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select name="branch" className="input" required onChange={handleChange} value={formData.branch} style={{ flex: 1 }}>
                                        <option value="">Select Branch</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowBranchModal(true)}
                                        className="btn btn-secondary"
                                        style={{ padding: '10px 16px', minWidth: 'auto' }}
                                        title="Add New Branch"
                                    >
                                        <PlusIcon style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Truck */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Truck *
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select name="truck" className="input" required onChange={handleChange} value={formData.truck} style={{ flex: 1 }}>
                                        <option value="">Select Truck</option>
                                        {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowTruckModal(true)}
                                        className="btn btn-secondary"
                                        style={{ padding: '10px 16px', minWidth: 'auto' }}
                                        title="Add New Truck"
                                    >
                                        <PlusIcon style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Party */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Party *
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select name="party" className="input" required onChange={handleChange} value={formData.party} style={{ flex: 1 }}>
                                        <option value="">Select Party</option>
                                        {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowPartyModal(true)}
                                        className="btn btn-secondary"
                                        style={{ padding: '10px 16px', minWidth: 'auto' }}
                                        title="Add New Party"
                                    >
                                        <PlusIcon style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Invoice Number */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Invoice Number
                                </label>
                                <input type="text" name="invoice_number" className="input" onChange={handleChange} value={formData.invoice_number} placeholder="INV-12345" />
                            </div>

                            {/* Invoice Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Invoice Date
                                </label>
                                <input type="date" name="invoice_date" className="input" onChange={handleChange} value={formData.invoice_date} />
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

                            {/* Quantity */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Quantity *
                                </label>
                                <input type="number" step="0.01" name="quantity" className="input" required onChange={handleChange} value={formData.quantity} placeholder="100" />
                            </div>

                            {/* Weight */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Weight (Tons) *
                                </label>
                                <input type="number" step="0.001" name="weight_in_tons" className="input" required onChange={handleChange} value={formData.weight_in_tons} placeholder="10.5" />
                            </div>

                            {/* Freight Amount */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Freight Amount (₹) *
                                </label>
                                <input type="number" step="0.01" name="freight_amount" className="input" required onChange={handleChange} value={formData.freight_amount} placeholder="50000" />
                            </div>

                            {/* Delivery Date */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Expected Delivery Date
                                </label>
                                <input type="date" name="delivery_date" className="input" onChange={handleChange} value={formData.delivery_date} />
                            </div>

                            {/* Status */}
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                    Status
                                </label>
                                <select name="status" className="input" onChange={handleChange} value={formData.status}>
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_TRANSIT">In Transit</option>
                                    <option value="DELIVERED">Delivered</option>
                                </select>
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

            {/* Party Create Modal */}
            {showPartyModal && <CreatePartyModal onClose={() => setShowPartyModal(false)} />}
        </>
    );
}

// Create Branch Modal Component
function CreateBranchModal({ onClose }) {
    const { data: companies } = useGetCompaniesQuery();
    const [createBranch, { isLoading }] = useCreateBranchMutation();
    const [formData, setFormData] = useState({
        company: '',
        name: '',
        code: '',
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
            await createBranch(formData).unwrap();
            alert('Branch created successfully!');
            onClose();
        } catch (error) {
            alert('Error creating branch: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <QuickCreateModal title="Create New Branch" onClose={onClose} onSubmit={handleSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Company *</label>
                    <select className="input" required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}>
                        <option value="">Select Company</option>
                        {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
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
                    <label className="form-label">Phone *</label>
                    <input type="tel" className="input" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Email *</label>
                    <input type="email" className="input" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
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
