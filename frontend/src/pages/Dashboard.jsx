import {
    TruckIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
    const stats = [
        {
            name: 'Active Trucks',
            value: '42',
            change: '+12%',
            changeType: 'positive',
            icon: TruckIcon,
            color: '#3b82f6',
            bgColor: '#eff6ff'
        },
        {
            name: 'Pending LRs',
            value: '23',
            change: '-5%',
            changeType: 'negative',
            icon: DocumentTextIcon,
            color: '#8b5cf6',
            bgColor: '#f5f3ff'
        },
        {
            name: 'Open HPAs',
            value: '18',
            change: '+8%',
            changeType: 'positive',
            icon: ClockIcon,
            color: '#f59e0b',
            bgColor: '#fffbeb'
        },
        {
            name: "Today's Revenue",
            value: '₹2.5L',
            change: '+15%',
            changeType: 'positive',
            icon: CurrencyDollarIcon,
            color: '#22c55e',
            bgColor: '#f0fdf4'
        },
    ];

    const recentLRs = [
        { id: 'LR1001', truck: 'MH01AB1001', party: 'ABC Logistics', status: 'Completed', amount: 16000 },
        { id: 'LR1002', truck: 'MH01AB1002', party: 'XYZ Transport', status: 'In Transit', amount: 17000 },
        { id: 'LR1003', truck: 'MH01AB1003', party: 'PQR Cargo', status: 'Pending', amount: 18000 },
        { id: 'LR1004', truck: 'MH01AB1004', party: 'ABC Logistics', status: 'Completed', amount: 19000 },
        { id: 'LR1005', truck: 'MH01AB1005', party: 'DEF Freight', status: 'In Transit', amount: 20000 },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                    <span className="gradient-text">Dashboard</span>
                </h1>
                <p style={{ color: '#6b7280' }}>Welcome back! Here's your overview.</p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px'
            }}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.name} className="card" style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>
                                        {stat.name}
                                    </p>
                                    <p style={{ fontSize: '32px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                                        {stat.value}
                                    </p>
                                    <p style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: stat.changeType === 'positive' ? '#16a34a' : '#dc2626'
                                    }}>
                                        {stat.change} from last week
                                    </p>
                                </div>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '12px',
                                    background: stat.bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon style={{ width: '28px', height: '28px', color: stat.color }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                    Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <button className="btn btn-primary" style={{ justifyContent: 'center' }}>
                        <DocumentTextIcon style={{ width: '20px', height: '20px' }} />
                        Create New LR
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                        <TruckIcon style={{ width: '20px', height: '20px' }} />
                        Add Truck Payment
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                        <CurrencyDollarIcon style={{ width: '20px', height: '20px' }} />
                        Generate Bill
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
                    Recent LRs
                </h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                    LR Number
                                </th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                    Truck Number
                                </th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                    Party
                                </th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                    Status
                                </th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLRs.map((lr, index) => (
                                <tr
                                    key={lr.id}
                                    style={{
                                        borderBottom: index < recentLRs.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                        {lr.id}
                                    </td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                        {lr.truck}
                                    </td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', color: '#4b5563' }}>
                                        {lr.party}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        <span className={`badge badge-${lr.status === 'Completed' ? 'success' :
                                                lr.status === 'In Transit' ? 'warning' : 'error'
                                            }`}>
                                            {lr.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 12px', fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                        ₹{lr.amount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
