# Transportation & Logistics ERP - Backend

Backend implementation progress:

## ✅ Completed
- [x] Django project setup with proper structure
- [x] Requirements files (base, development, production)
- [x] Custom User model with role-based access (SUPER_ADMIN, ACCOUNTS_MANAGER, ACCOUNTS_OPERATOR, BRANCH_OPERATOR, AUDITOR)
- [x] JWT authentication configuration  
- [x] Master data models:
  - BaseModel with full audit trail (created_by, updated_by, deleted_by, soft delete)
  - Company, Branch, Party, Truck
  - ChartOfAccounts
  - GSTConfig, TDSConfig
- [x] DRF ViewSets with filtering, search, and pagination
- [x] Serializers for all master data
- [x] URL routing for `/api/v1/accounts/` and `/api/v1/masters/`
- [x] CORS configuration for frontend development
- [x] API documentation with drf-spectacular (Swagger UI)

## 🔄 Next Steps
1. Create initial migrations
2. Test API endpoints
3. Build remaining operational apps (LR, HPA, Payments, POD, Billing)
4. Set up frontend with React + Vite

## 📌 Notes
- Using SQLite for quick development start  
- PostgreSQL configuration ready (commented in settings)
- All apps follow modular structure with full separation of concerns
- Audit trail implemented across all models for compliance
