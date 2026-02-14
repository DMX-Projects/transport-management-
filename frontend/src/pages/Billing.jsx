import { useState, useEffect } from 'react';
import { useGetBillsQuery, useCreateBillMutation, useUpdateBillMutation, useGetBillItemsQuery, useCreateBillItemMutation, useGetHPADetailsForBillingQuery } from '../features/billing/billingApi';
import { useAuth } from '../hooks/useAuth';
import { useGetLRsQuery } from '../features/lr/lrApi';
import { useGetConsignorsQuery } from '../features/masters/mastersApi';
import { useGetBranchesQuery } from '../features/masters/mastersApi';
import { useGetHPAsQuery } from '../features/hpa/hpaApi';
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon, DocumentTextIcon, PencilIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchableSelect } from '../hooks/useSearchableSelect';

export default function Billing() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const debouncedSearch = useDebouncedValue(searchTerm, 300);

    const { data: billsData, isLoading: isLoadingBills } = useGetBillsQuery({ ...filters, search: debouncedSearch, page, page_size: pageSize });
    const [createBill, { isLoading: isCreating }] = useCreateBillMutation();
    const [updateBill, { isLoading: isUpdating }] = useUpdateBillMutation();
    const { canEdit } = useAuth();

    // Extract arrays from API response
    const bills = Array.isArray(billsData) ? billsData : (billsData?.results || []);

    const handleCreateBill = async (formData) => {
        try {
            await createBill(formData).unwrap();
            setShowCreateModal(false);
            alert('✅ Bill created successfully!');
        } catch (error) {
            console.error('Error creating Bill:', error);
            let errorMessage = 'Error creating Bill:\n\n';
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
            case 'PAID':
                return 'badge-success';
            case 'ACKNOWLEDGED':
                return 'badge-info';
            case 'SENT':
                return 'badge-warning';
            case 'GENERATED':
                return 'badge-info';
            case 'DRAFT':
                return 'badge-secondary';
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
                        <span className="gradient-text">Billing & Invoicing</span>
                    </h1>
                    <p style={{ color: '#6b7280' }}>Generate freight bills with GST calculations for consignors</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <PlusIcon style={{ width: '20px', height: '20px' }} />
                    Create New Bill
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
                                placeholder="Bill Number, Consignor..."
                                style={{ paddingLeft: '40px' }}
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                            Status
                        </label>
                        <select
                            className="input"
                            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                        >
                            <option value="">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="GENERATED">Generated</option>
                            <option value="SENT">Sent</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bills List */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Bills/Invoices</h2>
                {isLoadingBills ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
                ) : bills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No Bills found. Create your first Bill!</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        {/* Pagination controls */}
                        {billsData?.count !== undefined && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                                <button className="btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={!billsData?.previous}>Prev</button>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Page {page}</span>
                                <button className="btn" onClick={() => setPage(page + 1)} disabled={!billsData?.next}>Next</button>
                                <select className="input" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value) || 25); setPage(1); }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>Total: {billsData?.count || bills.length}</span>
                            </div>
                        )}
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Bill Number</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Date</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Consignor</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Period</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Total Qty</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>GST</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Grand Total</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map((bill, index) => (
                                    <tr
                                        key={bill.id}
                                        style={{ borderBottom: index < bills.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{bill.bill_number || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{bill.consignor_name || '-'}</td>
                                        <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>
                                            {bill.from_date && bill.to_date ? `${new Date(bill.from_date).toLocaleDateString()} - ${new Date(bill.to_date).toLocaleDateString()}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563', textAlign: 'right' }}>{bill.total_quantity_mt || 0} MT</td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                            ₹{parseFloat(bill.total_amount || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', color: '#6b7280', textAlign: 'right' }}>
                                            ₹{parseFloat((bill.sgst_amount || 0) + (bill.cgst_amount || 0)).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                                            ₹{parseFloat(bill.grand_total || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px 12px' }}>
                                            <span className={`badge ${getStatusBadgeClass(bill.status)}`}>
                                                {bill.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                            {canEdit && (
                                                <button
                                                    onClick={() => {/* Edit functionality - to be implemented */}}
                                                    style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6366f1' }}
                                                    title="Edit Bill (Only SUPER_ADMIN)"
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

            {/* Create Bill Modal */}
            {showCreateModal && (
                <CreateBillModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateBill}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

function CreateBillModal({ onClose, onSubmit, isLoading }) {
    const { data: consignorsData } = useGetConsignorsQuery();
    const { data: branchesData } = useGetBranchesQuery();
    const { data: lrsData } = useGetLRsQuery(); // Get all LRs - filter by consignor in component
    const [hpaSearch, setHpaSearch] = useState('');
    const [hpaPage, setHpaPage] = useState(1);
    const { data: hpasData } = useGetHPAsQuery({ search: hpaSearch, page: hpaPage, page_size: 10 }); // Backend-driven search & pagination
    const { isSuperAdmin, user } = useAuth(); // Get current user role
    
    const branchSearch = useSearchableSelect('/masters/branches/');
    const consignorSearch = useSearchableSelect('/masters/consignors/');
    
    const consignors = Array.isArray(consignorsData) ? consignorsData : (consignorsData?.results || []);
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);
    const lrs = Array.isArray(lrsData) ? lrsData : (lrsData?.results || []);
    const hpas = Array.isArray(hpasData) ? hpasData : (hpasData?.results || []);

    const [formData, setFormData] = useState({
        branch: isSuperAdmin ? '' : String(user?.branch?.id || ''), // SuperAdmin must select; Branch users auto-assigned
        consignor: '',
        bill_date: new Date().toISOString().split('T')[0],
        from_date: '',
        to_date: '',
        hsn_sac_code: '996791',
        vendor_code: '',
        gstin: '',
        consignor_gstin: '',
        consignor_pan: '',
        state_code: '',
        gst_payable_by: 'SERVICE',
        status: 'DRAFT',
        remarks: '',
        consignor_note: '',
    });

    const [billItems, setBillItems] = useState([]); // Array of { lr, destination, quantity_mt, freight_rate, total_amount, remarks }
    const [selectedConsignor, setSelectedConsignor] = useState(null);
    const [availableLRs, setAvailableLRs] = useState([]); // LRs for selected consignor
    const [selectedHPAId, setSelectedHPAId] = useState('');
    const { data: hpaDetails } = useGetHPADetailsForBillingQuery(selectedHPAId, { skip: !selectedHPAId });

    // Get selected consignor details
    useEffect(() => {
        if (formData.consignor) {
            const consignor = consignors.find(c => c.id === parseInt(formData.consignor));
            setSelectedConsignor(consignor);
            if (consignor) {
                setFormData(prev => ({
                    ...prev,
                    consignor_gstin: consignor.gstin || prev.consignor_gstin,
                    consignor_pan: consignor.pan || prev.consignor_pan,
                    state_code: consignor.state_code || prev.state_code,
                }));
                // Filter LRs for this consignor
                const filteredLRs = lrs.filter(lr => lr.consignor === consignor.id);
                setAvailableLRs(filteredLRs);
            }
        } else {
            setSelectedConsignor(null);
            setAvailableLRs([]);
        }
    }, [formData.consignor, consignors, lrs]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddBillItem = () => {
        setBillItems([...billItems, { lr: '', destination: '', quantity_mt: '', freight_rate: '', total_amount: '', remarks: '' }]);
    };

    const handleRemoveBillItem = (index) => {
        setBillItems(billItems.filter((_, i) => i !== index));
    };

    const handleBillItemChange = (index, field, value) => {
        const updatedItems = [...billItems];
        updatedItems[index][field] = value;

        // If LR selected, auto-populate
        if (field === 'lr' && value) {
            const lr = availableLRs.find(l => l.id === parseInt(value));
            if (lr) {
                updatedItems[index].destination = lr.to_location || '';
                updatedItems[index].quantity_mt = lr.quantity_mt || '';
                // Note: LR doesn't have freight_rate_per_ton - rate must be entered manually
                updatedItems[index].freight_rate = updatedItems[index].freight_rate || '';
            }
        }

        // Auto-calculate total amount
        if (field === 'quantity_mt' || field === 'freight_rate') {
            const quantity = field === 'quantity_mt' ? parseFloat(value) : parseFloat(updatedItems[index].quantity_mt);
            const rate = field === 'freight_rate' ? parseFloat(value) : parseFloat(updatedItems[index].freight_rate);
            if (quantity && rate) {
                updatedItems[index].total_amount = (quantity * rate).toFixed(2);
            }
        }

        setBillItems(updatedItems);
    };

    const calculateTotals = () => {
        const totalQty = billItems.reduce((sum, item) => sum + parseFloat(item.quantity_mt || 0), 0);
        const totalAmount = billItems.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
        const sgstRate = parseFloat(formData.sgst_rate || 9);
        const cgstRate = parseFloat(formData.cgst_rate || 9);
        const sgstAmount = (totalAmount * sgstRate) / 100;
        const cgstAmount = (totalAmount * cgstRate) / 100;
        const grandTotal = totalAmount + sgstAmount + cgstAmount;

        return { totalQty, totalAmount, sgstAmount, cgstAmount, grandTotal };
    };

    // Auto-populate bill data from selected HPA (LR, destination, qty, rate)
    useEffect(() => {
        if (!selectedHPAId) return;
        const hpa = hpas.find(h => h.id === parseInt(selectedHPAId));
        if (!hpa) return;
        const lr = lrs.find(l => l.id === (hpa.lr || hpa.lr_id));
        if (!lr) return;
        // Update consignor from LR
        setFormData(prev => ({ ...prev, consignor: lr.consignor || prev.consignor }));
        // Set single item derived from HPA/LR
        const qty = lr.quantity_mt || '';
        const rate = hpa.rate_per_tonne || '';
        const total = qty && rate ? (parseFloat(qty) * parseFloat(rate)).toFixed(2) : '';
        setBillItems([{ lr: lr.id, destination: lr.to_location || '', quantity_mt: qty, freight_rate: rate, total_amount: total, remarks: '' }]);
    }, [selectedHPAId, hpas, lrs]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (billItems.length === 0) {
            alert('Please add at least one LR entry to the bill.');
            return;
        }

        // Prepare bill data with line items
        const billData = {
            ...formData,
            bill_items: billItems.map(item => ({
                lr: parseInt(item.lr),
                destination: item.destination,
                quantity_mt: parseFloat(item.quantity_mt),
                freight_rate: parseFloat(item.freight_rate),
                total_amount: parseFloat(item.total_amount),
                remarks: item.remarks || '',
            })),
        };

        // Remove optional empty fields
        const optionalFields = ['vendor_code', 'gstin', 'state_code', 'remarks', 'consignor_note'];
        optionalFields.forEach(field => {
            if (!billData[field] || billData[field] === '') {
                delete billData[field];
            }
        });

        // Branch handling: SuperAdmin must provide branch; branch users should not send branch
        if (isSuperAdmin) {
            if (!billData.branch) {
                alert('Please select a Branch');
                return;
            }
        } else {
            delete billData.branch;
        }

        onSubmit(billData);
    };

    const totals = calculateTotals();

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
                    maxWidth: '1200px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: '32px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create New Bill/Invoice</h2>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Create bill with multiple LR entries and GST calculations</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        {/* Bill Header */}
                        <div style={{ gridColumn: 'span 2', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>Bill Details</h3>
                        </div>

                        {/* Branch - Required for SuperAdmin, auto-assigned for Branch users */}
                        {isSuperAdmin && (
                            <div>
                                <SearchableSelect
                                    options={branches}
                                    onSearch={branchSearch.searchFunction}
                                    value={formData.branch}
                                    onChange={handleChange}
                                    placeholder="Search branch..."
                                    label="Branch"
                                    name="branch"
                                    required
                                    getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                        )}

                        {/* Select HPA to auto-fill LR details */}
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                HPA (Auto-fill Bill Items) *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '8px' }}>
                                <input className="input" placeholder="Search HPA number..." value={hpaSearch} onChange={(e) => { setHpaSearch(e.target.value); setHpaPage(1); }} />
                                <button type="button" className="btn btn-secondary" disabled={!hpasData?.previous || hpaPage <= 1} onClick={() => setHpaPage(p => Math.max(1, p - 1))}>Prev</button>
                                <button type="button" className="btn btn-secondary" disabled={!hpasData?.next} onClick={() => setHpaPage(p => p + 1)}>Next</button>
                            </div>
                            <select className="input" value={selectedHPAId} onChange={(e) => setSelectedHPAId(e.target.value)} required>
                                <option value="">Select HPA</option>
                                {hpas.map(h => (
                                    <option key={h.id} value={h.id}>{h.hpa_number} • LR {h.lr_number} • Truck {h.truck_number}</option>
                                ))}
                            </select>
                            {selectedHPAId && (
                                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                                    ✓ Items auto-filled from selected HPA. Adjust rate or remarks if needed.
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Bill Date *
                            </label>
                            <input type="date" name="bill_date" className="input" required onChange={handleChange} value={formData.bill_date} />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <SearchableSelect
                                options={consignors}
                                onSearch={consignorSearch.searchFunction}
                                value={formData.consignor}
                                onChange={handleChange}
                                placeholder="Search consignor by name/GSTIN..."
                                label="Consignor (Company receiving bill)"
                                name="consignor"
                                required
                                getOptionLabel={(opt) => `${opt.name}${opt.gstin ? ` (${opt.gstin})` : ''}`}
                                getOptionValue={(opt) => opt.id}
                            />
                            {selectedConsignor && (
                                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                                    ✓ GSTIN: <strong>{selectedConsignor.gstin}</strong> - {selectedConsignor.address}, {selectedConsignor.city}, {selectedConsignor.state}
                                </p>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                From Date (Billing Period) *
                            </label>
                            <input type="date" name="from_date" className="input" required onChange={handleChange} value={formData.from_date} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                To Date (Billing Period) *
                            </label>
                            <input type="date" name="to_date" className="input" required onChange={handleChange} value={formData.to_date} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                HSN/SAC Code *
                            </label>
                            <input type="text" name="hsn_sac_code" className="input" required onChange={handleChange} value={formData.hsn_sac_code} placeholder="996791" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Vendor/Transporter Code
                            </label>
                            <input type="text" name="vendor_code" className="input" onChange={handleChange} value={formData.vendor_code} placeholder="36000023" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                GSTIN (Branch)
                            </label>
                            <input type="text" name="gstin" className="input" onChange={handleChange} value={formData.gstin} placeholder="Branch GSTIN" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Consignor GSTIN
                            </label>
                            <input type="text" name="consignor_gstin" className="input" onChange={handleChange} value={formData.consignor_gstin} placeholder="Auto from Consignor" readOnly style={{ background: '#f9fafb' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Consignor PAN
                            </label>
                            <input type="text" name="consignor_pan" className="input" onChange={handleChange} value={formData.consignor_pan} placeholder="Auto from Consignor" readOnly style={{ background: '#f9fafb' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                State Code
                            </label>
                            <input type="text" name="state_code" className="input" onChange={handleChange} value={formData.state_code} placeholder="29" maxLength="2" />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                GST Payable By *
                            </label>
                            <select name="gst_payable_by" className="input" required onChange={handleChange} value={formData.gst_payable_by}>
                                <option value="SERVICE">Service Provider</option>
                                <option value="CONSIGNOR">Consignor</option>
                                <option value="CONSIGNEE">Consignee</option>
                            </select>
                        </div>

                        {/* Bill Line Items Section */}
                        <div style={{ gridColumn: 'span 2', marginTop: '16px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Bill Line Items (from HPA)</h3>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAddBillItem}
                                    style={{ padding: '8px 16px' }}
                                >
                                    <PlusIcon style={{ width: '18px', height: '18px' }} />
                                    Add LR Entry
                                </button>
                            </div>

                            {billItems.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '2px dashed #d1d5db' }}>
                                    <p style={{ color: '#6b7280', marginBottom: '8px' }}>No LR entries added yet</p>
                                    <button type="button" className="btn btn-secondary" onClick={handleAddBillItem}>
                                        Add First LR Entry
                                    </button>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>LR Number (auto)</th>
                                                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Destination</th>
                                                <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Qty (MT)</th>
                                                <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Freight Rate</th>
                                                <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Total</th>
                                                <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billItems.map((item, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            value={(lrs.find(l => l.id === parseInt(item.lr))?.lr_number) || ''}
                                                            readOnly
                                                            style={{ fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            required
                                                            value={item.destination}
                                                            onChange={(e) => handleBillItemChange(index, 'destination', e.target.value)}
                                                            placeholder="Destination"
                                                            style={{ fontSize: '13px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input"
                                                            required
                                                            value={item.quantity_mt}
                                                            onChange={(e) => handleBillItemChange(index, 'quantity_mt', e.target.value)}
                                                            placeholder="0"
                                                            style={{ textAlign: 'right', fontSize: '13px', minWidth: '100px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input"
                                                            required
                                                            value={item.freight_rate}
                                                            onChange={(e) => handleBillItemChange(index, 'freight_rate', e.target.value)}
                                                            placeholder="0"
                                                            style={{ textAlign: 'right', fontSize: '13px', minWidth: '100px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="input"
                                                            required
                                                            value={item.total_amount}
                                                            readOnly
                                                            style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, background: '#f9fafb', minWidth: '120px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveBillItem(index)}
                                                            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                            title="Remove"
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

                            {/* Bill Summary */}
                            {billItems.length > 0 && (
                                <div style={{ marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: '12px', border: '2px solid #0ea5e9' }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#0369a1' }}>Bill Summary</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>Total Quantity (MT)</p>
                                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{totals.totalQty.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>Total Amount</p>
                                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>₹{totals.totalAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>SGST @ 9%</p>
                                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{totals.sgstAmount.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '13px', color: '#0369a1', marginBottom: '4px' }}>CGST @ 9%</p>
                                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>₹{totals.cgstAmount.toFixed(2)}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2', paddingTop: '16px', borderTop: '2px solid #bae6fd' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <p style={{ fontSize: '16px', fontWeight: 700, color: '#0369a1' }}>Grand Total</p>
                                                <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>₹{totals.grandTotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* HPA Transaction Reference Section */}
                        {billItems.length > 0 && billItems.some(item => item.lr) && (
                            <div style={{ gridColumn: 'span 2', marginTop: '16px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <InformationCircleIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>HPA Transaction Reference</h3>
                                    <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>(For verification only - not included in bill)</span>
                                </div>
                                <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '2px solid #93c5fd' }}>
                                    {billItems.map((item, index) => {
                                        if (!item.lr) return null;
                                        const lr = availableLRs.find(l => l.id === parseInt(item.lr));
                                        if (!lr) return null;
                                        const hpa = hpas.find(h => h.lr === lr.id);
                                        if (!hpa) return (
                                            <div key={index} style={{ marginBottom: '12px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                                <p style={{ fontSize: '13px', color: '#92400e' }}>
                                                    <strong>LR {lr.lr_number}:</strong> No HPA created yet
                                                </p>
                                            </div>
                                        );
                                        
                                        return (
                                            <HPATransactionInfo key={index} hpa={hpa} lr={lr} />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Status and Notes */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Status *
                            </label>
                            <select name="status" className="input" required onChange={handleChange} value={formData.status}>
                                <option value="DRAFT">Draft</option>
                                <option value="GENERATED">Generated</option>
                                <option value="SENT">Sent to Consignor</option>
                                <option value="ACKNOWLEDGED">Acknowledged</option>
                                <option value="PAID">Paid</option>
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>
                                Consignor Note
                            </label>
                            <textarea name="consignor_note" className="input" onChange={handleChange} value={formData.consignor_note} rows="2" placeholder="Note for consignor..." />
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
                        <button type="submit" className="btn btn-primary" disabled={isLoading || !formData.consignor || billItems.length === 0}>
                            {isLoading ? 'Creating...' : 'Create Bill'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// HPA Transaction Info Component
function HPATransactionInfo({ hpa, lr }) {
    const { data: hpaDetails, isLoading } = useGetHPADetailsForBillingQuery(hpa.id);

    if (isLoading) {
        return (
            <div style={{ marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Loading HPA details...</p>
            </div>
        );
    }

    if (!hpaDetails || !hpaDetails.hpa) {
        return null;
    }

    const transactions = hpaDetails.transactions || [];
    const totals = hpaDetails.transaction_totals || {};

    return (
        <div style={{ marginBottom: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        HPA #{hpa.hpa_number} - LR #{lr.lr_number}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                        {hpa.from_location} → {hpa.to_location} • {hpa.truck_number}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Balance to Pay</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                        ₹{parseFloat(hpa.balance_rs || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {transactions.length > 0 ? (
                <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Transactions:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {totals.advance > 0 && (
                            <div style={{ padding: '8px', background: '#dbeafe', borderRadius: '6px', border: '1px solid #3b82f6' }}>
                                <p style={{ fontSize: '10px', color: '#1e40af', marginBottom: '2px' }}>Advance Paid</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>₹{totals.advance.toLocaleString()}</p>
                            </div>
                        )}
                        {totals.diesel > 0 && (
                            <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                                <p style={{ fontSize: '10px', color: '#92400e', marginBottom: '2px' }}>Diesel</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>₹{totals.diesel.toLocaleString()}</p>
                            </div>
                        )}
                        {totals.bank > 0 && (
                            <div style={{ padding: '8px', background: '#d1fae5', borderRadius: '6px', border: '1px solid #10b981' }}>
                                <p style={{ fontSize: '10px', color: '#065f46', marginBottom: '2px' }}>Bank</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>₹{totals.bank.toLocaleString()}</p>
                            </div>
                        )}
                        {(totals.extra + totals.other) > 0 && (
                            <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #ef4444' }}>
                                <p style={{ fontSize: '10px', color: '#991b1b', marginBottom: '2px' }}>Extras/Other</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>₹{(totals.extra + totals.other).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justify: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#6b7280' }}>Lorry Hire:</span>
                            <span style={{ fontWeight: 600, color: '#111827' }}>₹{parseFloat(hpa.lorry_hire_rs || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#6b7280' }}>Total Deductions:</span>
                            <span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{parseFloat(hpa.total_deductions || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>No transactions recorded for this HPA yet.</p>
            )}
        </div>
    );
}
