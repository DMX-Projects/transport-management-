import { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchableSelect } from '../hooks/useSearchableSelect';
import { useCreateLRMutation } from '../features/lr/lrApi';
import { useAuth } from '../hooks/useAuth';

export default function CreateMultipleLRsModal({ branches, trucks, consignors, parties, onClose }) {
    const { isSuperAdmin, user } = useAuth();
    const [createLR] = useCreateLRMutation();
    const [isCreating, setIsCreating] = useState(false);

    // Search hooks
    const branchSearch = useSearchableSelect('/masters/branches/');
    const truckSearch = useSearchableSelect('/masters/trucks/');
    const consignorSearch = useSearchableSelect('/masters/consignors/');
    const partySearch = useSearchableSelect('/masters/parties/');

    const defaultBranchId = isSuperAdmin ? '' : String(user?.branch?.id || user?.branch || '');

    // Initial LR form data (old format - single LR with all fields)
    const getInitialLRData = () => ({
        branch: defaultBranchId,
        truck: '',
        consignor: '',
        consignee: '',
        lr_date: new Date().toISOString().split('T')[0],
        sap_number: '',
        from_location: '',
        to_location: '',
        destination: '',
        delivery_at: '',
        material_description: '',
        quantity_mt: '',
        number_of_bags: '',
        grade: '',
        grade_quantity: '',
        driver_name: '',
        driver_phone: '',
        driver_license_no: '',
        payment_term: 'TO_BE_BILLED',
        status: 'DRAFT',
        expected_loading_date: '',
        expected_delivery_date: '',
        remarks: '',
    });

    const [lrForms, setLrForms] = useState([getInitialLRData()]);
    const handleAddLRForm = () => {
        setLrForms([...lrForms, getInitialLRData()]);
    };

    const handleRemoveLRForm = (index) => {
        if (lrForms.length > 1) {
            setLrForms(lrForms.filter((_, i) => i !== index));
        } else {
            alert('At least one LR form is required');
        }
    };

    const handleLRFormChange = (index, field, value) => {
        const updated = [...lrForms];
        updated[index][field] = value;
        setLrForms(updated);
    };

    const handleTruckChange = (index, e) => {
        const truckId = e.target.value;
        const truck = trucks.find(t => t.id === parseInt(truckId));
        const updated = [...lrForms];
        updated[index].truck = truckId;
        if (truck) {
            updated[index].driver_name = truck.driver_name || updated[index].driver_name;
            updated[index].driver_phone = truck.driver_phone || updated[index].driver_phone;
            updated[index].driver_license_no = truck.driver_license_no || updated[index].driver_license_no;
        }
        setLrForms(updated);
    };

    const validateLRForm = (lrData, index) => {
        const required = ['truck', 'consignor', 'consignee', 'lr_date', 'from_location', 'to_location', 'quantity_mt', 'number_of_bags', 'driver_name', 'driver_phone', 'driver_license_no', 'status'];
        const missing = required.filter(field => !lrData[field] || lrData[field] === '');
        if (missing.length > 0) {
            alert(`LR #${index + 1}: Please fill all required fields: ${missing.join(', ')}`);
            return false;
        }
        return true;
    };

    const handleCreateLRs = async (e) => {
        e.preventDefault();

        // Validate all LR forms
        for (let i = 0; i < lrForms.length; i++) {
            if (!validateLRForm(lrForms[i], i)) {
                return;
            }
        }

        setIsCreating(true);
        const created = [];

        try {
            // Create each LR (convert old format to new format with single item)
            for (const lrForm of lrForms) {
                const lrItemData = {
                    consignor: lrForm.consignor,
                    consignee: lrForm.consignee,
                    from_location: lrForm.from_location,
                    to_location: lrForm.to_location,
                    destination: lrForm.destination,
                    delivery_at: lrForm.delivery_at,
                    material_description: lrForm.material_description,
                    quantity_mt: parseFloat(lrForm.quantity_mt),
                    number_of_bags: parseInt(lrForm.number_of_bags),
                    grade: lrForm.grade,
                    grade_quantity: lrForm.grade_quantity,
                    sap_number: lrForm.sap_number,
                    payment_term: lrForm.payment_term,
                };

                const lrContainerData = {
                    ...(isSuperAdmin && lrForm.branch ? { branch: lrForm.branch } : {}),
                    truck: lrForm.truck,
                    driver_name: lrForm.driver_name,
                    driver_phone: lrForm.driver_phone,
                    driver_license_no: lrForm.driver_license_no,
                    status: lrForm.status,
                    lr_date: lrForm.lr_date,
                    expected_loading_date: lrForm.expected_loading_date || undefined,
                    expected_delivery_date: lrForm.expected_delivery_date || undefined,
                    remarks: lrForm.remarks || undefined,
                };

                // Remove empty fields
                Object.keys(lrContainerData).forEach(key => {
                    if (lrContainerData[key] === '' || lrContainerData[key] === undefined) {
                        delete lrContainerData[key];
                    }
                });

                const formData = {
                    ...lrContainerData,
                    lr_items: [lrItemData]
                };

                const result = await createLR(formData).unwrap();
                created.push(result);
            }

            const lrNumbers = created.map((lr) => lr.lr_number).filter(Boolean);
            alert(
                lrNumbers.length
                    ? `LRs created successfully:\n\n${lrNumbers.join(', ')}`
                    : `Created ${created.length} LR(s) successfully!`
            );
            onClose();
        } catch (error) {
            console.error('Error creating LRs:', error);
            alert(`Error creating LRs: ${error.data?.detail || error.message || 'Unknown error'}`);
            setIsCreating(false);
        }
    };

    // Calculate total quantity from all LR forms
    const totalQuantity = lrForms.reduce((sum, form) => sum + parseFloat(form.quantity_mt || 0), 0);
    const totalBags = lrForms.reduce((sum, form) => sum + parseInt(form.number_of_bags || 0), 0);

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
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Create LR</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                <form onSubmit={handleCreateLRs}>
                    {lrForms.map((lrForm, index) => (
                        <div key={index} style={{
                            marginBottom: '32px',
                            padding: '24px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            background: index % 2 === 0 ? 'white' : '#fafafa'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151' }}>
                                    LR #{index + 1}
                                </h3>
                                {lrForms.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLRForm(index)}
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 12px', background: '#dc2626', color: 'white' }}
                                    >
                                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {/* Branch - SuperAdmin only */}
                                {isSuperAdmin && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Branch *</label>
                                        <SearchableSelect
                                            options={branches}
                                            onSearch={branchSearch.searchFunction}
                                            value={lrForm.branch}
                                            onChange={(e) => handleLRFormChange(index, 'branch', e.target.value)}
                                            placeholder="Search branch by name/code"
                                            name="branch"
                                            required
                                            getOptionLabel={(opt) => `${opt.name}${opt.code ? ` (${opt.code})` : ''}`}
                                            getOptionValue={(opt) => opt.id}
                                        />
                                    </div>
                                )}

                                {/* Truck */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Truck *</label>
                                    <SearchableSelect
                                        options={trucks}
                                        onSearch={truckSearch.searchFunction}
                                        value={lrForm.truck}
                                        onChange={(e) => handleTruckChange(index, e)}
                                        placeholder="Search and select truck..."
                                        name="truck"
                                        required
                                        getOptionLabel={(opt) => opt.truck_number}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>

                                {/* Consignor */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Consignor *</label>
                                    <SearchableSelect
                                        options={consignors}
                                        onSearch={consignorSearch.searchFunction}
                                        value={lrForm.consignor}
                                        onChange={(e) => handleLRFormChange(index, 'consignor', e.target.value)}
                                        placeholder="Search and select consignor..."
                                        name="consignor"
                                        required
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>

                                {/* Consignee */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Consignee *</label>
                                    <SearchableSelect
                                        options={parties}
                                        onSearch={partySearch.searchFunction}
                                        value={lrForm.consignee}
                                        onChange={(e) => handleLRFormChange(index, 'consignee', e.target.value)}
                                        placeholder="Search and select consignee/party..."
                                        name="consignee"
                                        required
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>

                                {/* LR Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>LR Date *</label>
                                    <input type="date" className="input" required value={lrForm.lr_date} onChange={(e) => handleLRFormChange(index, 'lr_date', e.target.value)} />
                                </div>

                                {/* SAP Number */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>SAP Number</label>
                                    <input type="text" className="input" value={lrForm.sap_number} onChange={(e) => handleLRFormChange(index, 'sap_number', e.target.value)} />
                                </div>

                                {/* From Location */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>From Location *</label>
                                    <input type="text" className="input" required value={lrForm.from_location} onChange={(e) => handleLRFormChange(index, 'from_location', e.target.value)} placeholder="Mumbai" />
                                </div>

                                {/* To Location */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>To Location *</label>
                                    <input type="text" className="input" required value={lrForm.to_location} onChange={(e) => handleLRFormChange(index, 'to_location', e.target.value)} placeholder="Bangalore" />
                                </div>

                                {/* Material Description */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Material Description</label>
                                    <textarea className="input" rows="2" value={lrForm.material_description} onChange={(e) => handleLRFormChange(index, 'material_description', e.target.value)} placeholder="Electronics, Textiles, etc." />
                                </div>

                                {/* Quantity (M.T.) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Quantity (M.T.) *</label>
                                    <input type="number" className="input" required step="0.01" value={lrForm.quantity_mt} onChange={(e) => handleLRFormChange(index, 'quantity_mt', e.target.value)} placeholder="35" />
                                </div>

                                {/* Number of Bags */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Number of Bags *</label>
                                    <input type="number" className="input" required value={lrForm.number_of_bags} onChange={(e) => handleLRFormChange(index, 'number_of_bags', e.target.value)} placeholder="700" />
                                </div>

                                {/* Grade */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Grade</label>
                                    <select className="input" value={lrForm.grade} onChange={(e) => handleLRFormChange(index, 'grade', e.target.value)}>
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
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Grade Quantity</label>
                                    <input type="text" className="input" value={lrForm.grade_quantity} onChange={(e) => handleLRFormChange(index, 'grade_quantity', e.target.value)} placeholder="35MT OPC" />
                                </div>

                                {/* Driver Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Driver Name *</label>
                                    <input type="text" className="input" required value={lrForm.driver_name} onChange={(e) => handleLRFormChange(index, 'driver_name', e.target.value)} placeholder="Nitin" />
                                </div>

                                {/* Driver License */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Driver License No. *</label>
                                    <input type="text" className="input" required value={lrForm.driver_license_no} onChange={(e) => handleLRFormChange(index, 'driver_license_no', e.target.value)} placeholder="MH13233" />
                                </div>

                                {/* Driver Mobile */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Driver Mobile *</label>
                                    <input type="tel" className="input" required value={lrForm.driver_phone} onChange={(e) => handleLRFormChange(index, 'driver_phone', e.target.value)} placeholder="9075051501" />
                                </div>

                                {/* Payment Term */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Payment Term *</label>
                                    <select className="input" required value={lrForm.payment_term} onChange={(e) => handleLRFormChange(index, 'payment_term', e.target.value)}>
                                        <option value="TO_BE_BILLED">To Be Billed</option>
                                        <option value="TO_PAY">To Pay</option>
                                        <option value="PAID">Paid</option>
                                    </select>
                                </div>

                                {/* Delivery At */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Delivery At</label>
                                    <input type="text" className="input" value={lrForm.delivery_at} onChange={(e) => handleLRFormChange(index, 'delivery_at', e.target.value)} placeholder="Specific delivery location" />
                                </div>

                                {/* Destination */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Destination</label>
                                    <input type="text" className="input" value={lrForm.destination} onChange={(e) => handleLRFormChange(index, 'destination', e.target.value)} placeholder="Final destination if different" />
                                </div>

                                {/* Status */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Status *</label>
                                    <select className="input" required value={lrForm.status} onChange={(e) => handleLRFormChange(index, 'status', e.target.value)}>
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
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Expected Loading Date</label>
                                    <input type="date" className="input" value={lrForm.expected_loading_date} onChange={(e) => handleLRFormChange(index, 'expected_loading_date', e.target.value)} />
                                </div>

                                {/* Expected Delivery Date */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Expected Delivery Date</label>
                                    <input type="date" className="input" value={lrForm.expected_delivery_date} onChange={(e) => handleLRFormChange(index, 'expected_delivery_date', e.target.value)} />
                                </div>

                                {/* Remarks */}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Remarks</label>
                                    <textarea className="input" rows="2" value={lrForm.remarks} onChange={(e) => handleLRFormChange(index, 'remarks', e.target.value)} placeholder="Any additional notes..." />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Totals */}
                    <div style={{
                        marginBottom: '24px',
                        padding: '16px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <strong>Total Quantity: {totalQuantity.toFixed(2)} MT</strong>
                        </div>
                        <div>
                            <strong>Total Bags: {totalBags}</strong>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddLRForm}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <PlusIcon style={{ width: '18px', height: '18px' }} />
                            Add Another LR
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isCreating}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isCreating}>
                            {isCreating ? 'Creating LRs...' : `Create ${lrForms.length} LR(s)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
