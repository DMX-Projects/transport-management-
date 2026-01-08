# Transportation & Logistics ERP - Frontend

Modern React application for the Transportation ERP system.

## ✅ Features Implemented

### Authentication
- Login page with JWT authentication
- Protected routes
- Auto-redirect based on auth state
- LocalStorage token persistence

### Modern UI Design
- **Dark Theme** with deep blue backgrounds
- **Glass Morphism** effects with backdrop blur
- **Gradient Text & Buttons** for visual impact
- **Smooth Animations** (fade-ins, pulses, transitions)
- **Responsive Layout** (mobile-first approach)

### Components
- Login Page with animated backgrounds
- Dashboard Layout with responsive sidebar
- Dashboard with KPI cards and data tables
- Navigation with active state highlighting

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Server runs at: http://localhost:5173

## 📦 Dependencies

- React 18
- Vite
- Redux Toolkit + RTK Query
- React Router v6
- Heroicons
- Axios

## 🎨 Design System

Colors defined in `src/index.css`:
- Primary: Purple/Blue gradients
- Background: Dark theme (#0f172a, #1e293b)
- Text: Light grays (#f1f5f9)

## 📁 Project Structure

```
src/
├── app/
│   ├── api.js           # RTK Query configuration
│   └── store.js         # Redux store
├── features/
│   └── auth/            # Authentication feature
├── components/
│   └── layout/          # Layout components
├── pages/               # Page components
├── App.jsx              # Root component
├── main.jsx             # Entry point
└── index.css            # Global styles
```

## 🔗 API Connection

Backend URL: `http://localhost:8000/api/v1`

Authentication endpoint: `/accounts/auth/login/`

## 📝 TODO

- [ ] Master data management pages
- [ ] LR management UI
- [ ] HPA tracking interface
- [ ] Payment entry forms
- [ ] POD upload
- [ ] Billing interface
- [ ] Reports & analytics
