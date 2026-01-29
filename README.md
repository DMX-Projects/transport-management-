# 🚚 Transport ERP System

A comprehensive **Transport Management ERP** built with **Django REST Framework** (backend) and **React** (frontend) for managing logistics operations including LR (Lorry Receipt) management, HPA (Hire Payment Advice), payments, billing, and more.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Module Overview](#module-overview)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### ✅ Implemented Modules

1. **Authentication & Authorization**
   - JWT-based authentication
   - User management with role-based access

2. **Master Data Management**
   - Companies, Branches, Parties (Customers)
   - Trucks (Own/Market), Chart of Accounts
   - GST & TDS Configuration

3. **LR (Lorry Receipt) Management**
   - Auto-generated LR numbers (LR0001, LR0002...)
   - Link to Branch, Truck, Party
   - Invoice tracking with edit audit trail
   - Search, filter, and date range queries
   - Soft delete functionality

4. **HPA (Hire Payment Advice) Management**
   - Link to LR with auto-population of truck & freight
   - Payment breakdown (advance, diesel, loading, unloading, other deductions)
   - Real-time balance calculation
   - Payment status tracking (Pending/Partial/Paid)
   - Payment history per truck

### 🚧 Upcoming Modules

- Payments Management
- POD (Proof of Delivery)
- Billing & Invoicing
- Receipts Management
- Accounting Integration
- Reports & Analytics

---

## 🛠 Tech Stack

### Backend
- **Framework:** Django 5.2.10 + Django REST Framework
- **Database:** SQLite (development) / PostgreSQL (production ready)
- **Authentication:** JWT (Simple JWT)
- **API Documentation:** drf-spectacular (OpenAPI/Swagger)
- **Filtering:** django-filter

### Frontend
- **Framework:** React 18 with Vite
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with modern design tokens
- **Icons:** Heroicons
- **HTTP Client:** RTK Query (built on fetch)

---

## 📁 Project Structure

```
transport/
├── backend/                      # Django Backend
│   ├── apps/
│   │   ├── accounts/            # User authentication & management
│   │   ├── masters/             # Master data (Company, Branch, Truck, Party)
│   │   ├── lr/                  # Lorry Receipt management
│   │   └── hpa/                 # Hire Payment Advice management
│   ├── transport_erp/           # Django project settings
│   ├── requirements/            # Python dependencies
│   │   ├── base.txt            # Common dependencies
│   │   ├── development.txt     # Dev-only dependencies
│   │   └── production.txt      # Production dependencies
│   ├── manage.py               # Django management script
│   └── db.sqlite3              # SQLite database (not in git)
│
└── frontend/                    # React Frontend
    ├── src/
    │   ├── app/                # Redux store & API setup
    │   ├── components/         # Reusable UI components
    │   ├── features/           # Feature-based modules
    │   │   ├── auth/          # Authentication logic
    │   │   ├── lr/            # LR API slice
    │   │   ├── hpa/           # HPA API slice
    │   │   └── masters/       # Masters API slice
    │   ├── pages/             # Page components
    │   └── main.jsx           # Entry point
    ├── package.json           # NPM dependencies
    └── vite.config.js         # Vite configuration
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python** 3.10 or higher
- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git**

---

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/transport-erp.git
cd transport-erp
```

### 2️⃣ Backend Setup

#### Step 1: Navigate to backend directory
```bash
cd backend
```

#### Step 2: Create virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install dependencies
```bash
pip install -r requirements/development.txt
```

#### Step 4: Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

#### Step 5: Create superuser
```bash
python manage.py createsuperuser
# Follow the prompts to create admin account
```

#### Step 6: Create sample data (optional)
```bash
python manage.py create_sample_data
```

### 3️⃣ Frontend Setup

#### Step 1: Navigate to frontend directory
```bash
cd ../frontend
```

#### Step 2: Install dependencies
```bash
npm install
```

---

## ▶️ Running the Application

### Backend Server

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
python manage.py runserver
```

Backend will run on: **http://localhost:8000**

### Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will run on: **http://localhost:5173**

### Access the Application

1. **Frontend:** http://localhost:5173
2. **Backend API:** http://localhost:8000/api/v1/
3. **Django Admin:** http://localhost:8000/admin/
4. **API Docs (Swagger):** http://localhost:8000/api/docs/

### Default Credentials

- **Username:** admin
- **Password:** (the one you created during `createsuperuser`)

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api/v1/
```

### Main Endpoints

#### Authentication
- `POST /accounts/login/` - Login (get JWT token)
- `POST /accounts/refresh/` - Refresh JWT token
- `POST /accounts/logout/` - Logout

#### Masters
- `GET/POST /masters/companies/` - Company management
- `GET/POST /masters/branches/` - Branch management
- `GET/POST /masters/trucks/` - Truck management
- `GET/POST /masters/parties/` - Party (customer) management

#### LR Management
- `GET/POST /lr/lorry-receipts/` - LR CRUD operations
- `GET /lr/lorry-receipts/{id}/` - Get specific LR
- `PATCH /lr/lorry-receipts/{id}/` - Update LR
- `DELETE /lr/lorry-receipts/{id}/` - Soft delete LR
- `GET /lr/lorry-receipts/by_date_range/` - Filter by date range

#### HPA Management
- `GET/POST /hpa/hire-payment-advices/` - HPA CRUD operations
- `GET /hpa/hire-payment-advices/pending_payments/` - Get pending payments
- `GET /hpa/hire-payment-advices/by_truck/?truck_id=1` - Get HPAs by truck
- `POST /hpa/hire-payment-advices/{id}/mark_as_paid/` - Mark as paid

### Interactive API Documentation

Visit **http://localhost:8000/api/docs/** for interactive Swagger UI documentation.

---

## 🎯 Module Overview

### LR (Lorry Receipt) Management

**Purpose:** Track and manage lorry receipts for freight transportation.

**Key Features:**
- Auto-generated LR numbers
- Link to Branch, Truck, and Party
- Track invoice details with edit history
- Multiple status tracking (Pending, In Transit, Delivered)
- Search and filter capabilities

**Workflow:**
1. Create LR → Select Branch, Truck, Party
2. Enter shipment details (from/to location, material, weight, freight)
3. Optionally add invoice details
4. Track delivery status
5. View audit history

### HPA (Hire Payment Advice) Management

**Purpose:** Manage truck hire payments and track deductions.

**Key Features:**
- Link to existing LR
- Auto-populate truck and freight from LR
- Track payment breakdown (advance, diesel, loading, unloading, other)
- Real-time balance calculation
- Payment status tracking

**Workflow:**
1. Create HPA → Select LR
2. System auto-fills truck & freight amount
3. Enter deductions (advance, diesel, etc.)
4. System calculates: Balance = Freight - Total Deductions
5. Optionally mark as paid with payment details
6. View payment history per truck

---

## 🔧 Environment Variables

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3

# For production with PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/transport_db
```

### Frontend (.env)

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📝 Development Commands

### Backend

```bash
# Create new Django app
python manage.py startapp app_name apps/app_name

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Django shell
python manage.py shell
```

### Frontend

```bash
# Install new package
npm install package-name

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Authors

- **Your Name** - Initial work - [@YourGitHub](https://github.com/YOUR_USERNAME)

---

## 🙏 Acknowledgments

- Django REST Framework documentation
- React and Redux Toolkit communities
- All contributors who helped with this project

---

## 📞 Support

For support, email your-email@example.com or open an issue in the GitHub repository.

---

**Happy Coding! 🚀**
