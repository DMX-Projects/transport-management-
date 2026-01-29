# Cleanup Checklist for GitHub

## Files/Folders to DELETE Before Pushing

### Backend
- [ ] `backend/db.sqlite3` - Database file (regenerate on clone)
- [ ] `backend/venv/` - Virtual environment (should be in .gitignore)
- [  ] `backend/**/__pycache__/` - Python bytecode
- [ ] `backend/**/*.pyc` - Compiled Python files
- [ ] `backend/media/` - User-uploaded files (if any)
- [ ] `backend/staticfiles/` - Collected static files
- [ ] `backend/.env` - Environment variables (create .env.example instead)

### Frontend
- [ ] `frontend/node_modules/` - NPM packages (should be in .gitignore)
- [ ] `frontend/dist/` - Build output
- [ ] `frontend/.env` - Environment variables (create .env.example instead)

### Root
- [ ] Any `.DS_Store` files (macOS)
- [ ] Any `Thumbs.db` files (Windows)
- [ ] Any `.vscode` or `.idea` folders (IDE settings)

## Files to CREATE

### Backend
- [ ] `backend/.env.example` - Template for environment variables
```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
```

### Frontend
- [ ] `frontend/.env.example` - Template for environment variables
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Root
- [x] `README.md` - Project documentation
- [x] `.gitignore` - Git ignore rules
- [ ] `LICENSE` - License file (if open source)

## Pre-Push Commands

### Clean Backend
```bash
cd backend
rm -rf venv/ __pycache__/ db.sqlite3
find . -type f -name "*.pyc" -delete
find . -type d -name "__pycache__" -delete
```

### Clean Frontend
```bash
cd frontend
rm -rf node_modules/ dist/ .vite
```

## Git Commands to Push

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Transport ERP System with LR and HPA Management"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/transport-erp.git

# Push to GitHub
git push -u origin main
```

## Post-Push: Update README

Replace these placeholders in README.md:
- `YOUR_USERNAME` - Your GitHub username
- `your-email@example.com` - Your contact email
- Add actual screenshots to README
- Update license information

## Verification Checklist

- [ ] .gitignore files are in place
- [ ] No sensitive data (passwords, tokens) in code
- [ ] db.sqlite3 is not tracked
- [ ] node_modules/ is not tracked
- [ ] venv/ is not tracked
- [ ] README.md is complete and accurate
- [ ] .env.example files are created
- [ ] All unnecessary files are removed
