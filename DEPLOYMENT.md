# Transport Management System - Production Deployment

## Server Details
- **Server IP**: 103.65.21.176
- **OS**: Ubuntu
- **User**: ubuntu

## Application URLs
- **Frontend**: http://103.65.21.176:5174/
- **Backend API**: http://103.65.21.176:8003/api/v1/
- **Admin Panel**: http://103.65.21.176:8003/admin/

## Port Configuration
- **Frontend (nginx)**: 5174
- **Backend (nginx)**: 8003
- **Backend (gunicorn internal)**: 8004
- **Redis**: localhost:6379/2 (Database 2)

## Directory Structure
```
Server Paths:
- Code: ~/transport-management-/
- Static Files: /var/www/transportmanagemnt/staticfiles/
- Media Files: /var/www/transportmanagemnt/media/
- Logs: /var/www/transportmanagemnt/logs/
- Frontend Build: /var/www/transportmanagemnt/frontend/dist/
```

## Services
### Backend Service
- **Service Name**: transportmgmtbe.service
- **Service File**: /etc/systemd/system/transportmgmtbe.service
- **Status**: `sudo systemctl status transportmgmtbe.service`
- **Restart**: `sudo systemctl restart transportmgmtbe.service`
- **Logs**: `sudo journalctl -u transportmgmtbe.service -f`

### Nginx Configuration
- **Backend Config**: /etc/nginx/sites-available/transportmgmtbe
- **Frontend Config**: /etc/nginx/sites-available/transportmgmtfe
- **Test Config**: `sudo nginx -t`
- **Restart**: `sudo systemctl restart nginx`
- **Logs**: 
  - Backend: /var/log/nginx/transportmgmtbe-access.log
  - Frontend: /var/log/nginx/transportmgmtfe-access.log

## Deployment Process

### 1. Update Code
```bash
cd ~/transport-management-
git pull origin dev2
```

### 2. Update Backend Dependencies (if needed)
```bash
cd ~/transport-management-/backend
source env/bin/activate
pip install -r requirements.txt
```

### 3. Update Database (if needed)
```bash
cd ~/transport-management-/backend
source env/bin/activate
python manage.py migrate
```

### 4. Collect Static Files
```bash
cd ~/transport-management-/backend
source env/bin/activate
python manage.py collectstatic --noinput
```

### 5. Restart Backend Service
```bash
sudo systemctl restart transportmgmtbe.service
```

### 6. Build and Deploy Frontend
```bash
# On local machine:
cd frontend
npm run build

# Copy to server:
scp -r dist/* ubuntu@103.65.21.176:/var/www/transportmanagemnt/frontend/dist/

# Or use rsync for incremental updates:
rsync -avz --delete dist/ ubuntu@103.65.21.176:/var/www/transportmanagemnt/frontend/dist/
```

### 7. Restart Nginx (if config changed)
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Variables
Located at: `~/transport-management-/backend/.env`

Key variables:
- `DEBUG=False`
- `SECRET_KEY` (production secret)
- `ALLOWED_HOSTS`
- `STATIC_ROOT`
- `MEDIA_ROOT`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`

## Firewall Rules
Ports opened with UFW:
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 5174 (Frontend)
- 8003 (Backend API)

## Celery Configuration
- **Broker**: Redis (localhost:6379/2)
- **Result Backend**: Redis (localhost:6379/2)
- **Note**: Using DB 2 to avoid conflicts with other applications

## Monitoring and Troubleshooting

### Check Backend Service Status
```bash
sudo systemctl status transportmgmtbe.service
sudo journalctl -u transportmgmtbe.service -n 100
```

### Check Gunicorn Logs
```bash
tail -f /var/www/transportmanagemnt/logs/gunicorn_access.log
tail -f /var/www/transportmanagemnt/logs/gunicorn_error.log
```

### Check Nginx Logs
```bash
tail -f /var/log/nginx/transportmgmtbe-access.log
tail -f /var/log/nginx/transportmgmtbe-error.log
tail -f /var/log/nginx/transportmgmtfe-access.log
```

### Test Endpoints
```bash
# Backend health
curl http://127.0.0.1:8003/admin/

# Frontend
curl http://127.0.0.1:5174/

# API
curl http://127.0.0.1:8003/api/v1/accounts/
```

### Restart All Services
```bash
sudo systemctl restart transportmgmtbe.service
sudo systemctl restart nginx
```

## Database
- **Type**: SQLite
- **Location**: ~/transport-management-/backend/db.sqlite3
- **Backup**: Copy db.sqlite3 file regularly

## Security Notes
1. SECRET_KEY is stored in .env file (not in git)
2. DEBUG is set to False in production
3. ALLOWED_HOSTS is restricted to server IP and localhost
4. CORS is configured for specific origins
5. CSRF protection is enabled

## Quick Commands Reference
```bash
# Pull latest code
ssh ubuntu@103.65.21.176 'cd ~/transport-management- && git pull'

# Restart backend
ssh ubuntu@103.65.21.176 'sudo systemctl restart transportmgmtbe.service'

# Check backend status
ssh ubuntu@103.65.21.176 'sudo systemctl status transportmgmtbe.service'

# Collect static files
ssh ubuntu@103.65.21.176 'cd ~/transport-management-/backend && source env/bin/activate && python manage.py collectstatic --noinput'

# View backend logs
ssh ubuntu@103.65.21.176 'sudo journalctl -u transportmgmtbe.service -f'

# View nginx logs
ssh ubuntu@103.65.21.176 'sudo tail -f /var/log/nginx/transportmgmtbe-error.log'
```

## Deployment Checklist
- [ ] Code pushed to git repository
- [ ] Pull latest code on server
- [ ] Virtual environment activated
- [ ] Dependencies installed/updated
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Frontend built locally
- [ ] Frontend dist copied to server
- [ ] Backend service restarted
- [ ] Nginx configuration tested
- [ ] Nginx restarted (if needed)
- [ ] Test frontend URL
- [ ] Test backend API URL
- [ ] Test admin panel URL
- [ ] Check service logs for errors

## Next Steps (Optional)
1. Set up SSL/HTTPS with Let's Encrypt
2. Configure Celery worker service
3. Set up automatic backups for database
4. Configure log rotation
5. Set up monitoring and alerts
6. Configure Redis persistence
