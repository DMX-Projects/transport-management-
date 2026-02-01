import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    useCreateLRMutation,
    useUpdateLRMutation,
    useGetLRByIdQuery
} from '../features/lr/lrApi';
import {
    useGetBranchesQuery,
    useGetTrucksQuery,
    useGetConsignorsQuery,
    useGetPartiesQuery
} from '../features/masters/mastersApi';
import {
    ArrowLeftIcon,
    CheckIcon,
    DocumentTextIcon,
    PlusIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import SearchableSelect from '../components/SearchableSelect';

export default function LRForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    // API Queries
    const { data: lrData, isLoading: isLoadingLR } = useGetLRByIdQuery(id, { skip: !id });
    const { data: branchesData } = useGetBranchesQuery();
    const { data: trucksData } = useGetTrucksQuery();
    const { data: consignorsData } = useGetConsignorsQuery();
    const { data: partiesData } = useGetPartiesQuery();

    const [createLR, { isLoading: isCreating }] = useCreateLRMutation();
    const [updateLR, { isLoading: isUpdating }] = useUpdateLRMutation();

    // Extract arrays
    const branches = branchesData?.results || branchesData || [];
    const trucks = trucksData?.results || trucksData || [];
    const consignors = consignorsData?.results || consignorsData || [];
    const parties = partiesData?.results || partiesData || [];

    // Form state - Container level
    const [formData, setFormData] = useState({
        branch: '',
        truck: '',
        lr_date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        remarks: '',
        driver_name: '',
        driver_phone: '',
        driver_license_no: ''
    });

    // LR Items state - Array of items
    const [lrItems, setLrItems] = useState([
        {
            consignor: '',
            consignee: '',
            from_location: '',
            to_location: '',
            destination: '',
            material_description: '',
            quantity_mt: '',
            number_of_bags: '',
            grade: '',
            grade_quantity: '',
            loading_from_department: '',
            please_load: '',
            number_of_loads: '',
            grade_type_of_pkg: '',
            sap_number: '',
            payment_term: 'TO_BE_BILLED',
            gst_payable_by: 'SERVICE',
            delivery_at: ''
        }
    ]);

    // Load LR data when editing
    useEffect(() => {
        if (isEditMode && lrData) {
            setFormData({
                branch: lrData.branch || '',
                truck: lrData.truck || '',
                lr_date: lrData.lr_date || '',
                status: lrData.status || 'DRAFT',
                remarks: lrData.remarks || '',
                driver_name: lrData.driver_name || '',
                driver_phone: lrData.driver_phone || '',
                driver_license_no: lrData.driver_license_no || ''
            });

            // Load LR items if available
            if (lrData.lr_items && lrData.lr_items.length > 0) {
                setLrItems(lrData.lr_items.map(item => ({
                    consignor: item.consignor || '',
                    consignee: item.consignee || '',
                    from_location: item.from_location || '',
                    to_location: item.to_location || '',
                    destination: item.destination || item.to_location || '',
                    material_description: item.material_description || '',
                    quantity_mt: item.quantity_mt || '',
                    number_of_bags: item.number_of_bags || '',
                    grade: item.grade || '',
                    grade_quantity: item.grade_quantity || '',
                    loading_from_department: item.loading_from_department || '',
                    please_load: item.please_load || '',
                    number_of_loads: item.number_of_loads || '',
                    grade_type_of_pkg: item.grade_type_of_pkg || '',
                    sap_number: item.sap_number || '',
                    payment_term: item.payment_term || 'TO_BE_BILLED',
                    gst_payable_by: item.gst_payable_by || 'SERVICE',
                    delivery_at: item.delivery_at || ''
                })));
            }
        }
    }, [isEditMode, lrData]);

    // Track previous truck value to detect changes
    const [previousTruck, setPreviousTruck] = useState(null);

    // Auto-populate driver details when truck is selected/changed
    useEffect(() => {
        if (formData.truck && trucks.length > 0) {
            const selectedTruck = trucks.find(t => t.id === parseInt(formData.truck));
            if (selectedTruck && formData.truck !== previousTruck) {
                // Truck has changed - auto-populate driver fields
                setFormData(prev => ({
                    ...prev,
                    driver_name: selectedTruck.driver_name || prev.driver_name || '',
                    driver_phone: selectedTruck.driver_phone || prev.driver_phone || '',
                    driver_license_no: selectedTruck.driver_license_no || prev.driver_license_no || ''
                }));
                setPreviousTruck(formData.truck);
            }
        }
    }, [formData.truck, trucks, previousTruck]);

    // Add new LR item
    const addLRItem = () => {
        setLrItems([...lrItems, {
            consignor: '',
            consignee: '',
            from_location: '',
            to_location: '',
            destination: '',
            material_description: '',
            quantity_mt: '',
            number_of_bags: '',
            grade: '',
            grade_quantity: '',
            loading_from_department: '',
            please_load: '',
            number_of_loads: '',
            grade_type_of_pkg: '',
            sap_number: '',
            payment_term: 'TO_BE_BILLED',
            gst_payable_by: 'SERVICE',
            delivery_at: ''
        }]);
    };

    // Remove LR item
    const removeLRItem = (index) => {
        if (lrItems.length > 1) {
            setLrItems(lrItems.filter((_, i) => i !== index));
        } else {
            toast.error('At least one item is required');
        }
    };

    // Update LR item
    const updateLRItem = (index, field, value) => {
        const updated = [...lrItems];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-set destination from to_location if empty
        if (field === 'to_location' && !updated[index].destination) {
            updated[index].destination = value;
        }
        setLrItems(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate at least one item
        if (lrItems.length === 0) {
            toast.error('At least one LR item is required');
            return;
        }

        // Validate required fields in items
        for (let i = 0; i < lrItems.length; i++) {
            const item = lrItems[i];
            if (!item.consignor || !item.consignee || !item.from_location || !item.to_location || !item.material_description) {
                toast.error(`Item ${i + 1}: Please fill all required fields (Consignor, Consignee, From Location, To Location, Material Description)`);
                return;
            }
        }

        const loadingToast = toast.loading(isEditMode ? 'Updating LR...' : 'Creating LR...');
        
        try {
            if (isEditMode) {
                // Update only container fields (items managed separately)
                await updateLR({ 
                    id, 
                    ...formData 
                }).unwrap();
                toast.success('LR updated successfully!', { id: loadingToast });
            } else {
                // Create with lr_items array
                const createPayload = {
                    branch: formData.branch,
                    truck: formData.truck,
                    lr_date: formData.lr_date,
                    status: formData.status || 'DRAFT',
                    remarks: formData.remarks,
                    driver_name: formData.driver_name,
                    driver_phone: formData.driver_phone,
                    driver_license_no: formData.driver_license_no,
                    lr_items: lrItems.map(item => ({
                        consignor: item.consignor,
                        consignee: item.consignee,
                        from_location: item.from_location,
                        to_location: item.to_location,
                        destination: item.destination || item.to_location,
                        material_description: item.material_description,
                        quantity_mt: item.quantity_mt || '0',
                        number_of_bags: item.number_of_bags || '0',
                        grade: item.grade || '',
                        grade_quantity: item.grade_quantity || '',
                        loading_from_department: item.loading_from_department || '',
                        please_load: item.please_load || '',
                        number_of_loads: item.number_of_loads || '0',
                        grade_type_of_pkg: item.grade_type_of_pkg || '',
                        sap_number: item.sap_number || '',
                        payment_term: item.payment_term || 'TO_BE_BILLED',
                        gst_payable_by: item.gst_payable_by || 'SERVICE',
                        delivery_at: item.delivery_at || ''
                    }))
                };
                
                await createLR(createPayload).unwrap();
                toast.success('LR created successfully!', { id: loadingToast });
            }
            navigate('/lr');
        } catch (error) {
            console.error('Error saving LR:', error);
            
            let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} LR`;
            
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

    if (isEditMode && isLoadingLR) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading LR details...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/lr')}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
                >
                    <ArrowLeftIcon style={{ width: '18px', height: '18px' }} />
                    Back to LR List
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <DocumentTextIcon style={{ width: '28px', height: '28px', color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
                            {isEditMode ? 'Edit Lorry Receipt' : 'Create New Lorry Receipt'}
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            {isEditMode ? `Editing LR: ${lrData?.lr_number || id}` : 'Fill in the details below to create a new LR'}
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
                                <label className="form-label">LR Date *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.lr_date}
                                    onChange={(e) => setFormData({ ...formData, lr_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Status</label>
                                <select
                                    className="input"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="PENDING_HPA">Pending HPA</option>
                                    <option value="ISSUED">Issued</option>
                                    <option value="LOADING">Loading</option>
                                    <option value="IN_TRANSIT">In Transit</option>
                                    <option value="UNLOADING">Unloading</option>
                                    <option value="DELIVERED">Delivered</option>
                                </select>
                            </div>

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
                        </div>
                    </div>

                    {/* Section 2: Driver Details */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            Driver Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                            <div>
                                <label className="form-label">Driver Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.driver_name}
                                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                                    placeholder="Enter driver name"
                                />
                            </div>

                            <div>
                                <label className="form-label">Driver Mobile</label>
                                <input
                                    type="tel"
                                    className="input"
                                    value={formData.driver_phone}
                                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                                    placeholder="Mobile number"
                                />
                            </div>

                            <div>
                                <label className="form-label">Driver License No.</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.driver_license_no}
                                    onChange={(e) => setFormData({ ...formData, driver_license_no: e.target.value })}
                                    placeholder="License number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: LR Items (Orders) */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                                LR Items (Orders) *
                            </h3>
                            {!isEditMode && (
                                <button
                                    type="button"
                                    onClick={addLRItem}
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <PlusIcon style={{ width: '16px', height: '16px' }} />
                                    Add Item
                                </button>
                            )}
                        </div>

                        {lrItems.map((item, index) => (
                            <div key={index} style={{ 
                                marginBottom: '24px', 
                                padding: '20px', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px',
                                background: '#f9fafb'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                                        Item {index + 1}
                                    </h4>
                                    {!isEditMode && lrItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeLRItem(index)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <TrashIcon style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                    {/* Parties */}
                                    <div>
                                        <label className="form-label">Consignor *</label>
                                        <SearchableSelect
                                            options={consignors.map(c => ({ value: c.id, label: c.name }))}
                                            value={item.consignor}
                                            onChange={(e) => updateLRItem(index, 'consignor', e.target.value)}
                                            placeholder="Select Consignor"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Consignee *</label>
                                        <SearchableSelect
                                            options={parties.map(p => ({ value: p.id, label: p.name }))}
                                            value={item.consignee}
                                            onChange={(e) => updateLRItem(index, 'consignee', e.target.value)}
                                            placeholder="Select Consignee"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Delivery At</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.delivery_at}
                                            onChange={(e) => updateLRItem(index, 'delivery_at', e.target.value)}
                                            placeholder="Delivery location"
                                        />
                                    </div>

                                    {/* Locations */}
                                    <div>
                                        <label className="form-label">From Location *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.from_location}
                                            onChange={(e) => updateLRItem(index, 'from_location', e.target.value)}
                                            placeholder="e.g., Chennai"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">To Location *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.to_location}
                                            onChange={(e) => updateLRItem(index, 'to_location', e.target.value)}
                                            placeholder="e.g., Bangalore"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Destination</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.destination}
                                            onChange={(e) => updateLRItem(index, 'destination', e.target.value)}
                                            placeholder="Final destination"
                                        />
                                    </div>

                                    {/* Material */}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Material Description *</label>
                                        <textarea
                                            className="input"
                                            rows={2}
                                            value={item.material_description}
                                            onChange={(e) => updateLRItem(index, 'material_description', e.target.value)}
                                            placeholder="Describe the material being transported..."
                                            required
                                        />
                                    </div>

                                    {/* Quantity & Bags */}
                                    <div>
                                        <label className="form-label">Quantity (MT) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input"
                                            value={item.quantity_mt}
                                            onChange={(e) => updateLRItem(index, 'quantity_mt', e.target.value)}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Number of Bags</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="input"
                                            value={item.number_of_bags}
                                            onChange={(e) => updateLRItem(index, 'number_of_bags', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Grade */}
                                    <div>
                                        <label className="form-label">Grade</label>
                                        <select
                                            className="input"
                                            value={item.grade}
                                            onChange={(e) => updateLRItem(index, 'grade', e.target.value)}
                                        >
                                            <option value="">Select Grade</option>
                                            <option value="53">Grade 53</option>
                                            <option value="43">Grade 43</option>
                                            <option value="OPC">OPC (Ordinary Portland Cement)</option>
                                            <option value="PPC">PPC (Portland Pozzolana Cement)</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="form-label">Grade Quantity</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.grade_quantity}
                                            onChange={(e) => updateLRItem(index, 'grade_quantity', e.target.value)}
                                            placeholder="e.g., 35MT"
                                        />
                                    </div>

                                    {/* Loading Details */}
                                    <div>
                                        <label className="form-label">Loading From Department</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.loading_from_department}
                                            onChange={(e) => updateLRItem(index, 'loading_from_department', e.target.value)}
                                            placeholder="Department name"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Please Load</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.please_load}
                                            onChange={(e) => updateLRItem(index, 'please_load', e.target.value)}
                                            placeholder="Loading instructions"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Number of Loads</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="input"
                                            value={item.number_of_loads}
                                            onChange={(e) => updateLRItem(index, 'number_of_loads', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Grade/Type of Package</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.grade_type_of_pkg}
                                            onChange={(e) => updateLRItem(index, 'grade_type_of_pkg', e.target.value)}
                                            placeholder="e.g., 53/43/OPC"
                                        />
                                    </div>

                                    {/* SAP & Payment */}
                                    <div>
                                        <label className="form-label">SAP Number</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={item.sap_number}
                                            onChange={(e) => updateLRItem(index, 'sap_number', e.target.value)}
                                            placeholder="SAP number"
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label">Payment Term</label>
                                        <select
                                            className="input"
                                            value={item.payment_term}
                                            onChange={(e) => updateLRItem(index, 'payment_term', e.target.value)}
                                        >
                                            <option value="TO_BE_BILLED">To Be Billed</option>
                                            <option value="TO_PAY">To Pay</option>
                                            <option value="PAID">Paid</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="form-label">GST Payable By</label>
                                        <select
                                            className="input"
                                            value={item.gst_payable_by}
                                            onChange={(e) => updateLRItem(index, 'gst_payable_by', e.target.value)}
                                        >
                                            <option value="SERVICE">Service</option>
                                            <option value="CONSIGNOR">Consignor</option>
                                            <option value="CONSIGNEE">Consignee</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section 4: Remarks */}
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
                            onClick={() => navigate('/lr')}
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
                            {isEditMode ? 'Update LR' : 'Create LR'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
