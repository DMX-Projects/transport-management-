import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    useGetBillingTemplatesQuery,
    useCreateBillingTemplateMutation,
    useUpdateBillingTemplateMutation,
    useDeleteBillingTemplateMutation,
    useSetDefaultTemplateMutation,
    useDuplicateTemplateMutation,
} from '../features/billing/billingApi';
import { useGetConsignorsQuery } from '../features/masters/mastersApi';
import { useAuth } from '../hooks/useAuth';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    StarIcon,
    EyeIcon,
    XMarkIcon,
    CheckIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const TEMPLATE_TYPES = [
    { value: 'STANDARD', label: 'Standard Format', color: '#3b82f6' },
    { value: 'DETAILED', label: 'Detailed with Breakdown', color: '#10b981' },
    { value: 'SUMMARY', label: 'Summary Format', color: '#8b5cf6' },
    { value: 'CUSTOM', label: 'Custom Format', color: '#f59e0b' },
];

export default function BillingTemplates() {
    const { isSuperAdmin } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // API queries
    const { data: templatesData, isLoading, refetch } = useGetBillingTemplatesQuery({
        search,
        ...(typeFilter && { template_type: typeFilter }),
    });
    const { data: consignorsData = {} } = useGetConsignorsQuery();
    
    // Handle paginated consignors response
    const consignors = consignorsData?.results || consignorsData || [];

    // Mutations
    const [createTemplate, { isLoading: isCreating }] = useCreateBillingTemplateMutation();
    const [updateTemplate, { isLoading: isUpdating }] = useUpdateBillingTemplateMutation();
    const [deleteTemplate] = useDeleteBillingTemplateMutation();
    const [setDefault] = useSetDefaultTemplateMutation();
    const [duplicateTemplate] = useDuplicateTemplateMutation();

    const templates = templatesData?.results || templatesData || [];

    const handleCreate = () => {
        setEditingTemplate(null);
        setShowCreateModal(true);
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setShowCreateModal(true);
    };

    const handleDelete = async (template) => {
        if (!window.confirm(`Are you sure you want to delete/deactivate "${template.name}"?`)) {
            return;
        }
        const loadingToast = toast.loading('Deleting template...');
        try {
            await deleteTemplate(template.id).unwrap();
            toast.success('Template deleted successfully', { id: loadingToast });
            refetch();
        } catch (error) {
            toast.error(error.data?.message || 'Failed to delete template', { id: loadingToast });
        }
    };

    const handleSetDefault = async (template) => {
        const loadingToast = toast.loading('Setting as default...');
        try {
            await setDefault(template.id).unwrap();
            toast.success(`"${template.name}" set as default`, { id: loadingToast });
            refetch();
        } catch (error) {
            toast.error(error.data?.message || 'Failed to set default', { id: loadingToast });
        }
    };

    const handleDuplicate = async (template) => {
        const newName = prompt('Enter name for duplicated template:', `${template.name} (Copy)`);
        if (!newName) return;

        const newCode = prompt('Enter code for duplicated template:', `${template.code}_COPY`);
        if (!newCode) return;

        const loadingToast = toast.loading('Duplicating template...');
        try {
            await duplicateTemplate({
                id: template.id,
                name: newName,
                code: newCode.toUpperCase(),
            }).unwrap();
            toast.success('Template duplicated successfully', { id: loadingToast });
            refetch();
        } catch (error) {
            toast.error(error.data?.error || error.data?.message || 'Failed to duplicate template', { id: loadingToast });
        }
    };

    const getTypeColor = (type) => {
        const found = TEMPLATE_TYPES.find(t => t.value === type);
        return found?.color || '#6b7280';
    };

    const getTypeLabel = (type) => {
        const found = TEMPLATE_TYPES.find(t => t.value === type);
        return found?.label || type;
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                            Billing Templates
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                            Configure billing formats and calculation rules for different consignors
                        </p>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={handleCreate}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <PlusIcon style={{ width: '18px', height: '18px' }} />
                            Create Template
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input"
                    style={{ maxWidth: '300px' }}
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="input"
                    style={{ maxWidth: '200px' }}
                >
                    <option value="">All Types</option>
                    {TEMPLATE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
            </div>

            {/* Templates Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    Loading templates...
                </div>
            ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    <DocumentTextIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No Templates Found</p>
                    <p style={{ fontSize: '14px' }}>Create your first billing template to get started.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '20px'
                }}>
                    {templates.map(template => (
                        <div
                            key={template.id}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: template.is_default ? `2px solid ${getTypeColor(template.template_type)}` : '1px solid #e5e7eb',
                                position: 'relative'
                            }}
                        >
                            {/* Default Badge */}
                            {template.is_default && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '20px',
                                    background: getTypeColor(template.template_type),
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <StarIconSolid style={{ width: '12px', height: '12px' }} />
                                    DEFAULT
                                </div>
                            )}

                            {/* Header */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: `${getTypeColor(template.template_type)}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Cog6ToothIcon style={{ width: '20px', height: '20px', color: getTypeColor(template.template_type) }} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '2px' }}>
                                            {template.name}
                                        </h3>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            fontFamily: 'monospace'
                                        }}>
                                            {template.code}
                                        </span>
                                    </div>
                                </div>

                                {/* Type Badge */}
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    background: `${getTypeColor(template.template_type)}20`,
                                    color: getTypeColor(template.template_type)
                                }}>
                                    {getTypeLabel(template.template_type)}
                                </span>
                            </div>

                            {/* Info */}
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                                {template.consignor_name ? (
                                    <p>Assigned to: <strong>{template.consignor_name}</strong></p>
                                ) : (
                                    <p>Global template (available for all)</p>
                                )}
                                {!template.is_active && (
                                    <p style={{ color: '#ef4444', marginTop: '4px' }}>
                                        <strong>Inactive</strong>
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            {isSuperAdmin && (
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    borderTop: '1px solid #e5e7eb',
                                    paddingTop: '16px',
                                    marginTop: '16px'
                                }}>
                                    <button
                                        onClick={() => handleEdit(template)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#f3f4f6',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}
                                        title="Edit"
                                    >
                                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(template)}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#f3f4f6',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#374151'
                                        }}
                                        title="Duplicate"
                                    >
                                        <DocumentDuplicateIcon style={{ width: '16px', height: '16px' }} />
                                    </button>
                                    {!template.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(template)}
                                            style={{
                                                padding: '8px 12px',
                                                background: '#fef3c7',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: '#92400e'
                                            }}
                                            title="Set as Default"
                                        >
                                            <StarIcon style={{ width: '16px', height: '16px' }} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(template)}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#fee2e2',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            color: '#991b1b'
                                        }}
                                        title="Delete"
                                    >
                                        <TrashIcon style={{ width: '16px', height: '16px' }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <TemplateFormModal
                    template={editingTemplate}
                    consignors={consignors}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingTemplate(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingTemplate(null);
                        refetch();
                    }}
                    createTemplate={createTemplate}
                    updateTemplate={updateTemplate}
                    isCreating={isCreating}
                    isUpdating={isUpdating}
                />
            )}
        </div>
    );
}

// Template Form Modal Component
function TemplateFormModal({
    template,
    consignors,
    onClose,
    onSuccess,
    createTemplate,
    updateTemplate,
    isCreating,
    isUpdating
}) {
    const isEditing = !!template;
    
    const [formData, setFormData] = useState({
        name: template?.name || '',
        code: template?.code || '',
        description: template?.description || '',
        template_type: template?.template_type || 'STANDARD',
        consignor: template?.consignor || '',
        is_default: template?.is_default || false,
        is_active: template?.is_active ?? true,
        // JSON fields
        field_mapping: template?.field_mapping || {
            show_lr_number: true,
            show_invoice_number: true,
            show_truck_number: true,
            show_driver_name: false,
            show_hpa_number: true,
            show_freight_breakdown: true,
            show_material_description: true,
            show_destination: true,
        },
        tax_configuration: template?.tax_configuration || {
            gst_applicable: true,
            sgst_rate: 9.0,
            cgst_rate: 9.0,
            hsn_sac_code: '996791',
        },
    });

    const [activeTab, setActiveTab] = useState('basic');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const loadingToast = toast.loading(isEditing ? 'Updating template...' : 'Creating template...');
        
        try {
            const submitData = {
                ...formData,
                consignor: formData.consignor || null,
            };

            if (isEditing) {
                await updateTemplate({ id: template.id, ...submitData }).unwrap();
                toast.success('Template updated successfully', { id: loadingToast });
            } else {
                await createTemplate(submitData).unwrap();
                toast.success('Template created successfully', { id: loadingToast });
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving template:', error);
            const errorMsg = error.data?.message || error.message || 'Failed to save template';
            toast.error(errorMsg, { id: loadingToast, duration: 5000 });
        }
    };

    const updateFieldMapping = (field, value) => {
        setFormData(prev => ({
            ...prev,
            field_mapping: {
                ...prev.field_mapping,
                [field]: value
            }
        }));
    };

    const updateTaxConfig = (field, value) => {
        setFormData(prev => ({
            ...prev,
            tax_configuration: {
                ...prev.tax_configuration,
                [field]: value
            }
        }));
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                        {isEditing ? 'Edit Template' : 'Create New Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                        <XMarkIcon style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#f9fafb'
                }}>
                    {['basic', 'fields', 'taxes'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab ? '#3b82f6' : 'white',
                                color: activeTab === tab ? 'white' : '#374151',
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {tab === 'basic' && 'Basic Info'}
                            {tab === 'fields' && 'Field Settings'}
                            {tab === 'taxes' && 'Tax Configuration'}
                        </button>
                    ))}
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto' }}>
                    <div style={{ padding: '24px' }}>
                        {/* Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                            Template Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input"
                                            required
                                            placeholder="e.g., Chettinad Detailed Format"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                            Template Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            className="input"
                                            required
                                            disabled={isEditing}
                                            placeholder="e.g., CHET_DET_V1"
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="input"
                                        rows={2}
                                        placeholder="Brief description of this template..."
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                            Template Type
                                        </label>
                                        <select
                                            value={formData.template_type}
                                            onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                                            className="input"
                                        >
                                            {TEMPLATE_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                            Assign to Consignor
                                        </label>
                                        <select
                                            value={formData.consignor}
                                            onChange={(e) => setFormData({ ...formData, consignor: e.target.value })}
                                            className="input"
                                        >
                                            <option value="">Global (All Consignors)</option>
                                            {consignors.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '24px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_default}
                                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ fontSize: '14px' }}>Set as default template</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ fontSize: '14px' }}>Active</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Field Settings Tab */}
                        {activeTab === 'fields' && (
                            <div>
                                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                                    Select which fields to display on bills using this template:
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        { key: 'show_lr_number', label: 'LR Number' },
                                        { key: 'show_invoice_number', label: 'Invoice Number' },
                                        { key: 'show_truck_number', label: 'Truck Number' },
                                        { key: 'show_driver_name', label: 'Driver Name' },
                                        { key: 'show_hpa_number', label: 'HPA Number' },
                                        { key: 'show_freight_breakdown', label: 'Freight Breakdown' },
                                        { key: 'show_material_description', label: 'Material Description' },
                                        { key: 'show_destination', label: 'Destination' },
                                        { key: 'show_consignee', label: 'Consignee' },
                                        { key: 'show_from_location', label: 'From Location' },
                                        { key: 'show_to_location', label: 'To Location' },
                                        { key: 'show_rate_per_mt', label: 'Rate per MT' },
                                    ].map(field => (
                                        <label
                                            key={field.key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '12px',
                                                background: formData.field_mapping[field.key] ? '#f0fdf4' : '#f9fafb',
                                                border: formData.field_mapping[field.key] ? '1px solid #22c55e' : '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.field_mapping[field.key] || false}
                                                onChange={(e) => updateFieldMapping(field.key, e.target.checked)}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span style={{ fontSize: '14px' }}>{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tax Configuration Tab */}
                        {activeTab === 'taxes' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.tax_configuration.gst_applicable || false}
                                        onChange={(e) => updateTaxConfig('gst_applicable', e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>GST Applicable</span>
                                </label>

                                {formData.tax_configuration.gst_applicable && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                                SGST Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                value={formData.tax_configuration.sgst_rate || 0}
                                                onChange={(e) => updateTaxConfig('sgst_rate', parseFloat(e.target.value) || 0)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                                CGST Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                value={formData.tax_configuration.cgst_rate || 0}
                                                onChange={(e) => updateTaxConfig('cgst_rate', parseFloat(e.target.value) || 0)}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                                IGST Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                value={formData.tax_configuration.igst_rate || 0}
                                                onChange={(e) => updateTaxConfig('igst_rate', parseFloat(e.target.value) || 0)}
                                                className="input"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                        HSN/SAC Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tax_configuration.hsn_sac_code || ''}
                                        onChange={(e) => updateTaxConfig('hsn_sac_code', e.target.value)}
                                        className="input"
                                        placeholder="996791"
                                        style={{ maxWidth: '200px' }}
                                    />
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.tax_configuration.tds_applicable || false}
                                        onChange={(e) => updateTaxConfig('tds_applicable', e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '14px' }}>TDS Applicable</span>
                                </label>

                                {formData.tax_configuration.tds_applicable && (
                                    <div style={{ maxWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                                            TDS Rate (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={formData.tax_configuration.tds_rate || 0}
                                            onChange={(e) => updateTaxConfig('tds_rate', parseFloat(e.target.value) || 0)}
                                            className="input"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
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
                            {isEditing ? 'Update Template' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

