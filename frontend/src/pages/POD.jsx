import { useState, useEffect } from 'react';
import { useGetPODsQuery, useCreatePODMutation, useUpdatePODMutation } from '../features/pod/podApi';
import { useAuth } from '../hooks/useAuth';
import { useGetLRsQuery } from '../features/lr/lrApi';
import { useGetHPAsQuery } from '../features/hpa/hpaApi';
import { useGetBranchesQuery } from '../features/masters/mastersApi';
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon, DocumentArrowUpIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function POD() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});

    const { data: podsData, isLoading: isLoadingPODs } = useGetPODsQuery(filters);
    const [createPOD, { isLoading: isCreating }] = useCreatePODMutation();
    const [updatePOD, { isLoading: isUpdating }] = useUpdatePODMutation();
    const { canEdit } = useAuth();

    // Extract arrays from API response
    const pods = Array.isArray(podsData) ? podsData : (podsData?.results || []);

    const handleCreatePOD = async (formData) => {
        try {
            await createPOD(formData).unwrap();
            setShowCreateModal(false);
            alert('✅ POD created successfully!');
        } catch (error) {
            console.error('Error creating POD:', error);
            let errorMessage = 'Error creating POD:\n\n';
            if (error.data && typeof error.data === 'object' && !Array.isArray(error.data)) {
                Object.entries(error.data).forEach(([field, messages]) => {
                    const msgArray = Array.isArray(messages) ? messages : [messages];
                    errorMessage += `• ${field}: ${msgArray.join(', ')}\n`;
                });
            } else {
                errorMessage += error.data || error.message || 'Unknown error occurred';
            }
            alert(errorMessage);
        }
    };


    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'ACCEPTED':
                return 'badge-success';
            case 'VERIFIED':
                return 'badge-info';
            case 'DISPUTED':
                return 'badge-error';
            case 'RECEIVED':
                return 'badge-warning';
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
                        <span className="gradient-text">POD Management</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Upload, verify, and manage Proof of Delivery documents</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    Create New POD
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
                                placeholder="POD Number, LR Number..."
                                style={{ paddingLeft: '40px' }}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
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
                            <option value="RECEIVED">Received</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="DISPUTED">Disputed</option>
                            <option value="ACCEPTED">Accepted</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* POD List */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Proof of Deliveries</h2>
                {isLoadingPODs ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
                ) : pods.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No PODs found. Create your first POD!</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>POD Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>LR Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Delivery Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Delivered To</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Qty Received</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Condition</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pods.map((pod, index) => (
                                    <tr
                                        key={pod.id}
                                        style={{ borderBottom: index < pods.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{pod.pod_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{pod.pod_date ? new Date(pod.pod_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563', fontWeight: 600 }}>{pod.lr?.lr_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{pod.delivery_date ? new Date(pod.delivery_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{pod.delivered_to || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563', textAlign: 'right' }}>{pod.quantity_received_mt || '-'} MT</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{pod.goods_condition || '-'}</td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(pod.status)}`}>
                                                {pod.status || 'RECEIVED'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            {canEdit && (
                                                <button
                                                    onClick={() => {/* Edit functionality - to be implemented */}}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1' }}
                                                    title="Edit POD (Only SUPER_ADMIN)"
                                                >
                                                    <PencilIcon style={{ width: '18px', height: '18px' }} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create POD Modal */}
            {showCreateModal && (
                <CreatePODModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreatePOD}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

function CreatePODModal({ onClose, onSubmit, isLoading }) {
    const { data: lrsData } = useGetLRsQuery({ status__in: ['IN_TRANSIT', 'AT_UNLOADING'] }); // Only LRs that can have POD
    const { data: hpasData } = useGetHPAsQuery();
    const { data: branchesData } = useGetBranchesQuery();
    
    const lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || []);
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);

    const [formData, setFormData] = useState({
        branch: '',
        lr: '',
        hpa: '',
        pod_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_time: '',
        delivered_to: '',
        delivered_to_phone: '',
        delivery_signature: '',
        quantity_received_mt: '',
        number_of_bags_received: '',
        goods_condition: 'GOOD',
        delivery_remarks: '',
        consignee_remarks: '',
        status: 'RECEIVED',
        remarks: '',
    });

    const [selectedLR, setSelectedLR] = useState(null);
    const [selectedHPA, setSelectedHPA] = useState(null);

    // Get selected LR and HPA details
    useEffect(() => {
        if (formData.lr) {
            const lr = lrs.find(l => l.id === parseInt(formData.lr));
            setSelectedLR(lr);
            if (lr) {
                // Find matching HPA for this LR
                const hpa = hpas.find(h => h.lr === lr.id || h.lr_number === lr.lr_number);
                if (hpa) {
                    setSelectedHPA(hpa);
                    setFormData(prev => ({ ...prev, hpa: hpa.id }));
                }
            }
        } else {
            setSelectedLR(null);
            setSelectedHPA(null);
        }
    }, [formData.lr, lrs, hpas]);

    // Auto-populate from LR
    useEffect(() => {
        if (selectedLR) {
            setFormData(prev => ({
                ...prev,
                quantity_received_mt: selectedLR.quantity_mt || prev.quantity_received_mt,
                number_of_bags_received: selectedLR.number_of_bags || prev.number_of_bags_received,
            }));
        }
    }, [selectedLR]);

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            setFormData({ ...formData, pod_document: e.target.files[0] });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Create FormData for file upload
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
            if (key === 'pod_document' && formData[key]) {
                submitData.append(key, formData[key]);
            } else if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
                submitData.append(key, formData[key]);
            }
        });

        // Convert FormData to object for API (or handle file upload separately)
        const cleanedData = { ...formData };
        const optionalFields = ['delivery_time', 'delivered_to_phone', 'delivery_signature', 
            'delivery_remarks', 'consignee_remarks', 'remarks', 'pod_document'];
        
        optionalFields.forEach(field => {
            if (!cleanedData[field] || cleanedData[field] === '') {
                delete cleanedData[field];
            }
        });

        // Convert numbers
        ['quantity_received_mt', 'number_of_bags_received'].forEach(field => {
            if (cleanedData[field]) cleanedData[field] = field.includes('_mt') ? parseFloat(cleanedData[field]) : parseInt(cleanedData[field]);
        });

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
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create New POD</h2>
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
                            <select name="branch" className="input" required onChange={handleChange} value={formData.branch}>
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* POD Date */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                POD Date *
                            </label>
                            <input type="date" name="pod_date" className="input" required onChange={handleChange} value={formData.pod_date} />
                        </div>

                        {/* LR Selection */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Select LR * (HPA will auto-populate)
                            </label>
                            <select name="lr" className="input" required onChange={handleChange} value={formData.lr}>
                                <option value="">Select Lorry Receipt</option>
                                {lrs.map(lr => (
                                    <option key={lr.id} value={lr.id}>
                                        {lr.lr_number} - {lr.consignor_name} → {lr.consignee_name} - {lr.truck_number}
                                    </option>
                                ))}
                            </select>
                            {selectedLR && (
                                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                                    ✓ LR: <strong>{selectedLR.lr_number}</strong> - Qty: {selectedLR.quantity_mt} MT, Bags: {selectedLR.number_of_bags}
                                </p>
                            )}
                        </div>

                        {/* HPA Auto-populated */}
                        {selectedHPA && (
                            <div style={{ gridColumn: 'span 2', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                <p style={{ fontSize: '13px', color: '#0369a1' }}>
                                    ✓ Linked HPA: <strong>{selectedHPA.hpa_number}</strong> (Balance: ₹{parseFloat(selectedHPA.balance_rs || 0).toLocaleString()})
                                </p>
                                <input type="hidden" name="hpa" value={selectedHPA.id} />
                            </div>
                        )}

                        {/* Delivery Details */}
                        <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827', borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>Delivery Details</h3>
                        </div>

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

                        {/* Quantity Verification */}
                        <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827', borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>Quantity Verification</h3>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Quantity Received (MT) *
                            </label>
                            <input type="number" step="0.01" name="quantity_received_mt" className="input" required onChange={handleChange} value={formData.quantity_received_mt} placeholder="Auto from LR" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Number of Bags Received *
                            </label>
                            <input type="number" name="number_of_bags_received" className="input" required onChange={handleChange} value={formData.number_of_bags_received} placeholder="Auto from LR" />
                        </div>

                        {/* Goods Condition */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Goods Condition *
                            </label>
                            <select name="goods_condition" className="input" required onChange={handleChange} value={formData.goods_condition}>
                                <option value="GOOD">Good Condition</option>
                                <option value="DAMAGED">Damaged</option>
                                <option value="SHORT">Short Delivery</option>
                                <option value="EXCESS">Excess Delivery</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Status *
                            </label>
                            <select name="status" className="input" required onChange={handleChange} value={formData.status}>
                                <option value="RECEIVED">Received</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="DISPUTED">Disputed</option>
                                <option value="ACCEPTED">Accepted</option>
                            </select>
                        </div>

                        {/* Remarks */}
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

                        {/* POD Document Upload */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                POD Document (Photo/Scan)
                            </label>
                            <input type="file" name="pod_document" className="input" accept="image/*,.pdf" onChange={handleChange} />
                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Upload POD document or photo (optional)</p>
                        </div>

                        {/* Internal Remarks */}
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
                            {isLoading ? 'Creating...' : 'Create POD'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
