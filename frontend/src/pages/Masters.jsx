import { useState } from 'react';
import {
    useCreateBranchMutation,
    useGetBranchesQuery, useCreateTruckMutation,
    useGetTrucksQuery, useCreateConsignorMutation,
    useGetConsignorsQuery, useCreatePartyMutation,
    useGetPartiesQuery, useGetCompaniesQuery, useUpdateCompanyMutation, useCreateCompanyMutation
} from '../features/masters/mastersApi';
import { BuildingOfficeIcon, TruckIcon, UserGroupIcon, PlusIcon, XMarkIcon, MagnifyingGlassIcon, CogIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

export default function Masters() {
    const [activeTab, setActiveTab] = useState('consignors');
    const [showConsignorModal, setShowConsignorModal] = useState(false);
    const [showPartyModal, setShowPartyModal] = useState(false);
    const [showTruckModal, setShowTruckModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);

    const tabs = [
        { id: 'company', name: 'Company Settings', icon: CogIcon },
        { id: 'consignors', name: 'Consignors', icon: BuildingOfficeIcon },
        { id: 'parties', name: 'Parties/Consignees', icon: UserGroupIcon },
        { id: 'trucks', name: 'Trucks', icon: TruckIcon },
        { id: 'branches', name: 'Branches', icon: BuildingOfficeIcon },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    <span className="gradient-text">Master Data Management</span>
                </h1>
                <p style={{ color: '#6b7280' }}>Manage branches, consignors, parties, and trucks</p>
            </div>

            {/* Tabs */}
            <div className="card" style={{ padding: '0' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '16px 24px',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === tab.id ? '3px solid #6366f1' : '3px solid transparent',
                                    cursor: 'pointer',
                                    color: activeTab === tab.id ? '#6366f1' : '#6b7280',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon style={{ width: '20px', height: '20px' }} />
                                {tab.name}
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '24px' }}>
                    {activeTab === 'company' && <CompanyTab onShowCreateModal={() => setShowCreateCompanyModal(true)} />}
                    {activeTab === 'consignors' && <ConsignorsTab onAddNew={() => setShowConsignorModal(true)} />}
                    {activeTab === 'parties' && <PartiesTab onAddNew={() => setShowPartyModal(true)} />}
                    {activeTab === 'trucks' && <TrucksTab onAddNew={() => setShowTruckModal(true)} />}
                    {activeTab === 'branches' && <BranchesTab onAddNew={() => setShowBranchModal(true)} />}
                </div>
            </div>

            {/* Modals */}
            {showConsignorModal && <CreateConsignorModal onClose={() => setShowConsignorModal(false)} />}
            {showPartyModal && <CreatePartyModal onClose={() => setShowPartyModal(false)} />}
            {showTruckModal && <CreateTruckModal onClose={() => setShowTruckModal(false)} />}
            {showBranchModal && <CreateBranchModal onClose={() => setShowBranchModal(false)} />}
            {showCreateCompanyModal && <CreateCompanyModal onClose={() => setShowCreateCompanyModal(false)} />}
        </div>
    );
}

// Consignors Tab
function ConsignorsTab({ onAddNew }) {
    const { data: consignorsData, isLoading } = useGetConsignorsQuery();
    const [createConsignor, { isLoading: isCreating }] = useCreateConsignorMutation();
    const consignors = Array.isArray(consignorsData) ? consignorsData : (consignorsData?.results || []);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', code: '', gstin: '', pan: '', address: '', city: '', state: '',
        state_code: '', pincode: '', phone: '', email: '', contact_person: '', transporter_code: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createConsignor(formData).unwrap();
            alert('✅ Consignor created successfully!');
            setShowModal(false);
            setFormData({
                name: '', code: '', gstin: '', pan: '', address: '', city: '', state: '',
                state_code: '', pincode: '', phone: '', email: '', contact_person: '', transporter_code: ''
            });
        } catch (error) {
            alert('Error creating consignor: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Consignors (Companies Sending Goods)</h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <PlusIcon style={{ width: '18px', height: '18px' }} />
                    Add Consignor
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
            ) : consignors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No Consignors found. Add your first consignor!</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Code</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>GSTIN</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Location</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Contact</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consignors.map((consignor, index) => (
                                <tr
                                    key={consignor.id}
                                    style={{ borderBottom: index < consignors.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{consignor.code}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#111827' }}>{consignor.name}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{consignor.gstin}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{consignor.city}, {consignor.state}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{consignor.phone || consignor.email || '-'}</td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span className={`badge ${consignor.is_active ? 'badge-success' : 'badge-error'}`}>
                                            {consignor.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <CreateConsignorModalContent
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

// Parties Tab
function PartiesTab({ onAddNew }) {
    const { data: partiesData, isLoading } = useGetPartiesQuery();
    const [createParty, { isLoading: isCreating }] = useCreatePartyMutation();
    const parties = Array.isArray(partiesData) ? partiesData : (partiesData?.results || []);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', code: '', gstin: '', pan: '', address: '', city: '', state: '',
        pincode: '', phone: '', email: '', contact_person: '', delivery_address: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createParty(formData).unwrap();
            alert('✅ Party/Consignee created successfully!');
            setShowModal(false);
            setFormData({
                name: '', code: '', gstin: '', pan: '', address: '', city: '', state: '',
                pincode: '', phone: '', email: '', contact_person: '', delivery_address: ''
            });
        } catch (error) {
            alert('Error creating party: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Parties/Consignees (Destination Parties)</h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <PlusIcon style={{ width: '18px', height: '18px' }} />
                    Add Party
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
            ) : parties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No Parties found. Add your first party!</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Code</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>GSTIN</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Location</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Contact</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parties.map((party, index) => (
                                <tr
                                    key={party.id}
                                    style={{ borderBottom: index < parties.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{party.code}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#111827' }}>{party.name}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{party.gstin || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{party.city}, {party.state}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{party.phone || party.email || '-'}</td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span className={`badge ${party.is_active ? 'badge-success' : 'badge-error'}`}>
                                            {party.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <CreatePartyModalContent
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

// Trucks Tab
function TrucksTab({ onAddNew }) {
    const { data: trucksData, isLoading } = useGetTrucksQuery();
    const [createTruck, { isLoading: isCreating }] = useCreateTruckMutation();
    const trucks = Array.isArray(trucksData) ? trucksData : (trucksData?.results || []);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        truck_number: '', truck_type: 'MARKET', owner_name: '', owner_phone: '',
        driver_name: '', driver_phone: '', driver_license_no: '', capacity_tons: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createTruck(formData).unwrap();
            alert('✅ Truck created successfully!');
            setShowModal(false);
            setFormData({
                truck_number: '', truck_type: 'MARKET', owner_name: '', owner_phone: '',
                driver_name: '', driver_phone: '', driver_license_no: '', capacity_tons: ''
            });
        } catch (error) {
            alert('Error creating truck: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Trucks</h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <PlusIcon style={{ width: '18px', height: '18px' }} />
                    Add Truck
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
            ) : trucks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No Trucks found. Add your first truck!</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Truck Number</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Owner</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Driver</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Driver Phone</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Capacity</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trucks.map((truck, index) => (
                                <tr
                                    key={truck.id}
                                    style={{ borderBottom: index < trucks.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{truck.truck_number}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{truck.truck_type}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{truck.owner_name || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{truck.driver_name || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{truck.driver_phone || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563', textAlign: 'right' }}>{truck.capacity_tons || '-'} Tons</td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span className={`badge ${truck.is_active ? 'badge-success' : 'badge-error'}`}>
                                            {truck.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <CreateTruckModalContent
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

// Branches Tab
function BranchesTab({ onAddNew }) {
    const { isSuperAdmin } = useAuth();
    const { data: branchesData, isLoading } = useGetBranchesQuery();
    const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
    const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.results || []);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', code: '', address: '', city: '', state: '',
        pincode: '', phone: '', email: '', gstin: '', hsn_sac_code: '996791',
        lr_prefix: 'LR', invoice_prefix: 'INV', bill_prefix: 'BILL',
        manager_username: '', manager_password: '', manager_email: '', manager_phone: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createBranch(formData).unwrap();
            alert('✅ Branch created successfully!');
            setShowModal(false);
            setFormData({
                name: '', code: '', address: '', city: '', state: '',
                pincode: '', phone: '', email: '', gstin: '', hsn_sac_code: '996791',
                lr_prefix: 'LR', invoice_prefix: 'INV', bill_prefix: 'BILL',
                manager_username: '', manager_password: '', manager_email: '', manager_phone: ''
            });
        } catch (error) {
            alert('Error creating branch: ' + JSON.stringify(error.data || error.message));
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Branches</h2>
                {isSuperAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <PlusIcon style={{ width: '18px', height: '18px' }} />
                        Add Branch
                    </button>
                )}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
            ) : branches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No Branches found. Add your first branch!</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Code</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Company</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Location</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>GSTIN</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Contact</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map((branch, index) => (
                                <tr
                                    key={branch.id}
                                    style={{ borderBottom: index < branches.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{branch.code}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#111827' }}>{branch.name}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>{branch.company_name || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{branch.city}, {branch.state}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{branch.gstin || '-'}</td>
                                    <td style={{ padding: '16px 12px', fontSize: '13px', color: '#6b7280' }}>{branch.phone || branch.email || '-'}</td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span className={`badge ${branch.is_active ? 'badge-success' : 'badge-error'}`}>
                                            {branch.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <CreateBranchModalContent
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                    isLoading={isCreating}
                />
            )}
        </div>
    );
}

// Modal Components
function CreateConsignorModalContent({ formData, setFormData, onSubmit, onClose, isLoading }) {
    return (
        <QuickModal title="Create New Consignor" onClose={onClose} onSubmit={onSubmit} isLoading={isLoading}>
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
                    <input type="text" className="input" value={formData.state_code} onChange={(e) => setFormData({ ...formData, state_code: e.target.value })} placeholder="29" maxLength="2" />
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
        </QuickModal>
    );
}

function CreatePartyModalContent({ formData, setFormData, onSubmit, onClose, isLoading }) {
    return (
        <QuickModal title="Create New Party/Consignee" onClose={onClose} onSubmit={onSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                    <label className="form-label">Party Name *</label>
                    <input type="text" className="input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">Party Code *</label>
                    <input type="text" className="input" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">GSTIN</label>
                    <input type="text" className="input" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
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
                <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Delivery Address (if different)</label>
                    <textarea className="input" value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} rows="2" placeholder="Specific delivery address" />
                </div>
            </div>
        </QuickModal>
    );
}

function CreateTruckModalContent({ formData, setFormData, onSubmit, onClose, isLoading }) {
    return (
        <QuickModal title="Create New Truck" onClose={onClose} onSubmit={onSubmit} isLoading={isLoading}>
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
                <div>
                    <label className="form-label">Driver License No.</label>
                    <input type="text" className="input" value={formData.driver_license_no} onChange={(e) => setFormData({ ...formData, driver_license_no: e.target.value })} placeholder="MH13233" />
                </div>
                <div>
                    <label className="form-label">Capacity (Tons)</label>
                    <input type="number" step="0.01" className="input" value={formData.capacity_tons} onChange={(e) => setFormData({ ...formData, capacity_tons: e.target.value })} />
                </div>
            </div>
        </QuickModal>
    );
}

function CreateBranchModalContent({ formData, setFormData, onSubmit, onClose, isLoading }) {
    return (
        <QuickModal title="Create New Branch" onClose={onClose} onSubmit={onSubmit} isLoading={isLoading}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {/* Branch Details */}
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
                <div>
                    <label className="form-label">GSTIN</label>
                    <input type="text" className="input" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
                </div>
                <div>
                    <label className="form-label">HSN/SAC Code</label>
                    <input type="text" className="input" value={formData.hsn_sac_code} onChange={(e) => setFormData({ ...formData, hsn_sac_code: e.target.value })} placeholder="996791" />
                </div>
                <div>
                    <label className="form-label">LR Prefix</label>
                    <input type="text" className="input" value={formData.lr_prefix} onChange={(e) => setFormData({ ...formData, lr_prefix: e.target.value })} placeholder="LR" />
                </div>
                <div>
                    <label className="form-label">Invoice Prefix</label>
                    <input type="text" className="input" value={formData.invoice_prefix} onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })} placeholder="INV" />
                </div>
                <div>
                    <label className="form-label">Bill Prefix</label>
                    <input type="text" className="input" value={formData.bill_prefix} onChange={(e) => setFormData({ ...formData, bill_prefix: e.target.value })} placeholder="BILL" />
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
                    <input type="text" className="input" required value={formData.manager_username || ''} onChange={(e) => setFormData({ ...formData, manager_username: e.target.value })} placeholder="e.g., branch_mgr_001" />
                </div>
                <div>
                    <label className="form-label">Manager Password *</label>
                    <input type="password" className="input" required value={formData.manager_password || ''} onChange={(e) => setFormData({ ...formData, manager_password: e.target.value })} placeholder="Strong password" />
                </div>
                <div>
                    <label className="form-label">Manager Email *</label>
                    <input type="email" className="input" required value={formData.manager_email || ''} onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })} placeholder="manager@branch.com" />
                </div>
                <div>
                    <label className="form-label">Manager Phone *</label>
                    <input type="tel" className="input" required value={formData.manager_phone || ''} onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })} placeholder="8765432109" />
                </div>
            </div>
        </QuickModal>
    );
}

// Reusable Quick Modal
function QuickModal({ title, children, onClose, onSubmit, isLoading }) {
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
                    maxWidth: '700px',
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

// Company Settings Tab (SuperAdmin only)
function CompanyTab({ onShowCreateModal }) {
    const { isSuperAdmin } = useAuth();
    const { data: companiesData, isLoading } = useGetCompaniesQuery();
    const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
    
    const companies = Array.isArray(companiesData) ? companiesData : (companiesData?.results || []);
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const company = companies.length > 0 ? companies[0] : null;

    const handleEdit = (company) => {
        setEditingId(company.id);
        setEditFormData({ ...company });
    };

    const handleSave = async () => {
        try {
            await updateCompany({ id: editFormData.id, ...editFormData }).unwrap();
            setEditingId(null);
            alert('✅ Company details updated successfully!');
        } catch (error) {
            alert('Error updating company: ' + JSON.stringify(error.data || error.message));
        }
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>;
    }

    if (!company) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>⚠️ No Company Configured</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                    Create a company to get started. This company will be used for all branches, LRs, HPAs, and Bills.
                </p>
                <button className="btn btn-primary" onClick={onShowCreateModal} style={{ padding: '12px 24px', fontSize: '16px' }}>
                    <PlusIcon style={{ width: '20px', height: '20px', marginRight: '8px', display: 'inline' }} />
                    Create Company
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Company Configuration</h2>
                {isSuperAdmin && editingId !== company.id && (
                    <button className="btn btn-primary" onClick={() => handleEdit(company)}>
                        Edit Company Details
                    </button>
                )}
            </div>

            {isSuperAdmin && editingId === company.id ? (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '2px solid #6366f1',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px'
                }}>
                    <div>
                        <label className="form-label">Company Name *</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">GSTIN *</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.gstin}
                            onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                            placeholder="29AAIFC4150D2ZO"
                        />
                    </div>
                    <div>
                        <label className="form-label">PAN</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.pan}
                            onChange={(e) => setEditFormData({ ...editFormData, pan: e.target.value })}
                            placeholder="AAACR5055K"
                        />
                    </div>
                    <div>
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Phone</label>
                        <input
                            type="tel"
                            className="input"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">City</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.city}
                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">State</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.state}
                            onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Pincode</label>
                        <input
                            type="text"
                            className="input"
                            value={editFormData.pincode}
                            onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Address *</label>
                        <textarea
                            className="input"
                            rows="3"
                            value={editFormData.address}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        />
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '20px'
                }}>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Company Name</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{company.name}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>GSTIN</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{company.gstin || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>PAN</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{company.pan || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Email</p>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{company.email || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Phone</p>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{company.phone || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>City</p>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{company.city || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>State</p>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{company.state || '-'}</p>
                    </div>
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Pincode</p>
                        <p style={{ fontSize: '14px', color: '#111827' }}>{company.pincode || '-'}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2', background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Address</p>
                        <p style={{ fontSize: '14px', color: '#111827', whiteSpace: 'pre-wrap' }}>{company.address || '-'}</p>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '32px', padding: '16px', background: '#e0f2fe', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#075985', marginBottom: '8px' }}>ℹ️ Company Details on Reports</h3>
                <p style={{ fontSize: '13px', color: '#0c4a6e', margin: 0 }}>
                    The company information configured above will be automatically displayed on all LR, HPA, and Bill PDFs. Ensure all details are accurate.
                </p>
            </div>
        </div>
    );
}

// Create Company Modal
function CreateCompanyModal({ onClose }) {
    const [createCompany, { isLoading }] = useCreateCompanyMutation();
    const [formData, setFormData] = useState({
        name: '',
        gstin: '',
        pan: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.gstin) {
            alert('⚠️ Company Name and GSTIN are required!');
            return;
        }
        try {
            await createCompany(formData).unwrap();
            alert('✅ Company created successfully! You can now create branches.');
            onClose();
        } catch (error) {
            alert('Error creating company: ' + JSON.stringify(error.data?.detail || error.data || error.message));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
                padding: '32px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Create Company</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                    Create your company profile. This information will be used across all branches, LRs, HPAs, and Bills.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Company Name *</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="E.g., ABC Transport Pvt Ltd"
                        />
                    </div>

                    <div>
                        <label className="form-label">GSTIN *</label>
                        <input
                            type="text"
                            className="input"
                            required
                            value={formData.gstin}
                            onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                            placeholder="29AAIFC4150D2ZO"
                        />
                    </div>

                    <div>
                        <label className="form-label">PAN</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.pan}
                            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                            placeholder="AABCU5055K"
                        />
                    </div>

                    <div>
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="info@company.com"
                        />
                    </div>

                    <div>
                        <label className="form-label">Phone</label>
                        <input
                            type="tel"
                            className="input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="9876543210"
                        />
                    </div>

                    <div>
                        <label className="form-label">City</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="E.g., Mumbai"
                        />
                    </div>

                    <div>
                        <label className="form-label">State</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="E.g., Maharashtra"
                        />
                    </div>

                    <div>
                        <label className="form-label">Pincode</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            placeholder="400001"
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Address</label>
                        <textarea
                            className="input"
                            rows="3"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Enter full address"
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Company'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

