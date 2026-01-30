# Seeding Sample Data for Testing

Use these commands from the **backend** directory (with virtualenv activated) to populate the app with test data.

## One-time setup (if you have no users yet)

Create test users and branches (admin + branch managers):

```bash
cd backend
source venv/bin/activate
python manage.py create_test_users
```

- **Super Admin:** `admin` / `admin123`
- **Branch managers:** `mumbai_manager`, `delhi_manager`, `bangalore_manager`, `chennai_manager` (password: `admin123`)

## Full sample data (masters + LRs + HPAs + Payments + Bills + PODs)

Seeds companies, branches, trucks, consignors, parties, users, LRs, HPAs, payments, bills, and a few PODs:

```bash
cd backend
source venv/bin/activate
python manage.py seed_sample_data
```

- Creates **admin** user if missing (password: `admin123`).
- **3 branches** (Delhi, Mumbai, Bangalore).
- **5 trucks**, **3 consignors**, **3 parties**.
- **15 Lorry Receipts**, **10 HPAs**, **23 Payments**, **3 Bills**, **5 Proof of Deliveries**.

## After seeding: show data on the Dashboard

If the dashboard shows zeros (Active Trucks, Open LRs, Open HPAs, Revenue), refresh the pre-calculated stats:

```bash
python manage.py refresh_dashboard_stats
```

Then reload the dashboard page in the browser.

## Optional: Masters only

If you only want companies, branches, parties, and trucks (no LRs/HPAs):

```bash
python manage.py create_sample_data
```

Requires at least one user to exist (run `create_test_users` first).

## Notes

- Running `seed_sample_data` again will **add more** LRs, HPAs, payments, bills, and PODs (branches/trucks/consignors/parties are created only if they don’t exist).
- For a **clean test**, use a fresh database: run migrations on a new DB, then run `create_test_users` and `seed_sample_data` once.
