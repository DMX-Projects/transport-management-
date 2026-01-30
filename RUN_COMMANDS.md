# Commands to Run the Application

## Backend Setup & Run

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Activate virtual environment
```bash
# Virtual environment is located at: backend/venv
source venv/bin/activate

# You should see (venv) in your terminal prompt after activation
```

### 3. Install dependencies (if not already installed)
```bash
pip install -r requirements.txt
```

### 4. Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create superuser (if needed)
```bash
python manage.py createsuperuser
```

### 6. Start Django development server
```bash
python manage.py runserver
```

The backend will run on `http://localhost:8000` (or the port specified in settings)

---

## Frontend Setup & Run

### 1. Navigate to frontend directory (in a new terminal)
```bash
cd frontend
```

### 2. Install dependencies (if not already installed)
```bash
npm install
```

### 3. Start Vite development server
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or the port Vite assigns)

---

## Quick Start (Both Servers)

### Terminal 1 - Backend:
```bash
cd "/Users/venkatahardik/learn sq_ transport/transport-management-/backend"
source venv/bin/activate
python manage.py runserver
```

### Terminal 2 - Frontend:
```bash
cd "/Users/venkatahardik/learn sq_ transport/transport-management-/frontend"
npm run dev
```

---

## Testing the Fix

1. Open `http://localhost:5173/lr` in your browser
2. Click "Create LR" button
3. Fill in the form fields:
   - Driver License No.
   - Status
   - Expected Loading Date
   - Expected Delivery Date
   - Add at least one LR Item with Consignor, Consignee, From, To, and Quantity
4. Click "Create LR"
5. The LR should be created successfully without the 400 error

---

## Additional Commands

### Check for linting errors
```bash
# Backend
cd backend
python manage.py check

# Frontend
cd frontend
npm run lint
```

### View Django logs
The Django server will show request logs in the terminal where `runserver` is running.

### Access Django Admin (if configured)
```bash
# Navigate to http://localhost:8000/admin
# Login with superuser credentials
```
