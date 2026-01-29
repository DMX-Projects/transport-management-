import { useState, useEffect } from 'react';
import { useGetHPAsQuery, useCreateHPAMutation, useDeleteHPAMutation, useMarkAsPaidMutation } from '../features/hpa/hpaApi';
import { useGetLRsQuery } from '../features/lr/lrApi';
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export default function HPAManagement() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});

    const { data: hpasData, isLoading: isLoadingHPAs } = useGetHPAsQuery(filters);
    const [createHPA, { isLoading: isCreating }] = useCreateHPAMutation();
    const [deleteHPA] = useDeleteHPAMutation();

    // Extract arrays from API response
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);

    const handleCreateHPA = async (formData) => {
        try {
            await createHPA(formData).unwrap();
            setShowCreateModal(false);
            alert('✅ HPA created successfully!');
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

    const handleDeleteHPA = async (id) => {
        if (window.confirm('Are you sure you want to delete this HPA?')) {
            try {
                await deleteHPA(id).unwrap();
                alert('HPA deleted successfully!');
            } catch (error) {
                alert('Error deleting HPA');
            }
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'PAID':
                return 'badge-success';
            case 'PARTIAL':
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
                        <span className="gradient-text">HPA Management</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Track and manage Hire Payment Advices</p>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
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
                                placeholder="HPA Number, LR Number..."
                                style={{ paddingLeft: '40px' }}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partially Paid</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* HPA List */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
                    Hire Payment Advices
                </h2>

                {isLoadingHPAs ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        Loading...
                    </div>
                ) : hpas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        No HPAs found. Create your first HPA!
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>HPA Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Freight</th>
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
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{hpa.hpa_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{new Date(hpa.hpa_date).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{hpa.lr_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{hpa.truck_number}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                            ₹{parseFloat(hpa.freight_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#ef4444', textAlign: 'right' }}>
                                            -₹{parseFloat(hpa.total_deductions).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                                            ₹{parseFloat(hpa.balance_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(hpa.payment_status)}`}>
                                                {hpa.payment_status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteHPA(hpa.id)}
                                                style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                title="Delete HPA"
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

            {/* Create HPA Modal */}
            {showCreateModal && (
                <CreateHPAModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateHPA}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

function CreateHPAModal({ onClose, onSubmit, isLoading }) {
    const { data: lrsData } = useGetLRsQuery();
    const lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || []);

    const [formData, setFormData] = useState({
        lr: '',
        advance_paid: '0',
        diesel_amount: '0',
        loading_charges: '0',
        unloading_charges: '0',
        other_deductions: '0',
        other_deductions_description: '',
        paid_amount: '0',
        payment_date: '',
        payment_mode: '',
        remarks: '',
    });

    const [selectedLR, setSelectedLR] = useState(null);
    const [calculatedValues, setCalculatedValues] = useState({
        totalDeductions: 0,
        balance: 0,
    });

    // Get selected LR details
    useEffect(() => {
        if (formData.lr) {
            const lr = lrs.find(l => l.id === parseInt(formData.lr));
            setSelectedLR(lr);
        } else {
            setSelectedLR(null);
        }
    }, [formData.lr, lrs]);

    // Calculate totals whenever deductions change
    useEffect(() => {
        const totalDeductions = parseFloat(formData.advance_paid || 0) +
            parseFloat(formData.diesel_amount || 0) +
            parseFloat(formData.loading_charges || 0) +
            parseFloat(formData.unloading_charges || 0) +
            parseFloat(formData.other_deductions || 0);

        const freight = selectedLR ? parseFloat(selectedLR.freight_amount) : 0;
        const balance = freight - totalDeductions;

        setCalculatedValues({
            totalDeductions,
            balance,
        });
    }, [formData, selectedLR]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean up the form data - remove empty optional fields
        const cleanedData = { ...formData };
        if (!cleanedData.other_deductions_description) delete cleanedData.other_deductions_description;
        if (!cleanedData.payment_date) delete cleanedData.payment_date;
        if (!cleanedData.payment_mode) delete cleanedData.payment_mode;
        if (!cleanedData.remarks) delete cleanedData.remarks;

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
                    maxWidth: '900px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create New HPA</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        {/* LR Selection */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Select LR *
                            </label>
                            <select name="lr" className="input" required onChange={handleChange} value={formData.lr}>
                                <option value="">Select Lorry Receipt</option>
                                {lrs.map(lr => (
                                    <option key={lr.id} value={lr.id}>
                                        {lr.lr_number} - {lr.truck_number} - ₹{parseFloat(lr.freight_amount).toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Auto-populated info */}
                        {selectedLR && (
                            <>
                                <div style={{ gridColumn: 'span 2', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Truck</p>
                                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLR.truck_number}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Freight Amount</p>
                                            <p style={{ fontSize: '14px', fontWeight: 600 }}>₹{parseFloat(selectedLR.freight_amount).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Route</p>
                                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{selectedLR.from_location} → {selectedLR.to_location}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Payment Breakdown */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>Payment Breakdown</h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Advance Paid (₹) *
                            </label>
                            <input type="number" step="0.01" name="advance_paid" className="input" required onChange={handleChange} value={formData.advance_paid} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Diesel Amount (₹) *
                            </label>
                            <input type="number" step="0.01" name="diesel_amount" className="input" required onChange={handleChange} value={formData.diesel_amount} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Loading Charges (₹)
                            </label>
                            <input type="number" step="0.01" name="loading_charges" className="input" onChange={handleChange} value={formData.loading_charges} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Unloading Charges (₹)
                            </label>
                            <input type="number" step="0.01" name="unloading_charges" className="input" onChange={handleChange} value={formData.unloading_charges} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Other Deductions (₹)
                            </label>
                            <input type="number" step="0.01" name="other_deductions" className="input" onChange={handleChange} value={formData.other_deductions} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Deduction Description
                            </label>
                            <input type="text" name="other_deductions_description" className="input" onChange={handleChange} value={formData.other_deductions_description} placeholder="Optional" />
                        </div>

                        {/* Calculated Summary */}
                        <div style={{ gridColumn: 'span 2', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '2px solid #10b981' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Total Deductions</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>₹{calculatedValues.totalDeductions.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Balance to Pay</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>₹{calculatedValues.balance.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', fontWeight: 600 }}>Freight Amount</p>
                                    <p style={{ fontSize: '20px', fontWeight: 700 }}>₹{selectedLR ? parseFloat(selectedLR.freight_amount).toLocaleString() : '0'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '8px', marginBottom: '16px', color: '#111827' }}>Payment Details (Optional)</h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Paid Amount (₹)
                            </label>
                            <input type="number" step="0.01" name="paid_amount" className="input" onChange={handleChange} value={formData.paid_amount} placeholder="0" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Payment Date
                            </label>
                            <input type="date" name="payment_date" className="input" onChange={handleChange} value={formData.payment_date} />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Payment Mode
                            </label>
                            <select name="payment_mode" className="input" onChange={handleChange} value={formData.payment_mode}>
                                <option value="">Select Mode</option>
                                <option value="CASH">Cash</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>

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
