#!/bin/bash

# Transport Management Deployment Script
# This script deploys the application to production server

set -e  # Exit on error

echo "======================================"
echo "Transport Management Deployment"
echo "======================================"

# Configuration
SERVER="ubuntu@103.65.21.176"
APP_NAME="transport-management"
BACKEND_PORT=8004
FRONTEND_PORT=5174
NGINX_BACKEND_PORT=8003
NGINX_FRONTEND_PORT=5174

echo "Step 1: Creating directory structure on server..."
ssh $SERVER "sudo mkdir -p /var/www/transportmanagemnt/{staticfiles,media,logs,frontend/dist}"
ssh $SERVER "sudo mkdir -p /home/ubuntu/$APP_NAME/backend"
ssh $SERVER "sudo chown -R ubuntu:ubuntu /home/ubuntu/$APP_NAME"
ssh $SERVER "sudo chown -R ubuntu:ubuntu /var/www/transportmanagemnt"

echo "Step 2: Copying backend files to server..."
rsync -avz --exclude='env' --exclude='__pycache__' --exclude='*.pyc' --exclude='db.sqlite3' \
    ../backend/ $SERVER:~/transport-management/backend/

echo "Step 3: Creating virtual environment and installing requirements..."
ssh $SERVER "cd ~/transport-management/backend && python3 -m venv env"
ssh $SERVER "cd ~/transport-management/backend && source env/bin/activate && pip install --upgrade pip"
ssh $SERVER "cd ~/transport-management/backend && source env/bin/activate && pip install -r requirements.txt"
ssh $SERVER "cd ~/transport-management/backend && source env/bin/activate && pip install gunicorn"

echo "Step 4: Copying database..."
scp ../backend/db.sqlite3 $SERVER:~/transport-management/backend/

echo "Step 5: Collecting static files..."
ssh $SERVER "cd ~/transport-management/backend && source env/bin/activate && \
    export DEBUG=False && \
    export STATIC_ROOT=/var/www/transportmanagemnt/staticfiles && \
    export MEDIA_ROOT=/var/www/transportmanagemnt/media && \
    python manage.py collectstatic --noinput"

echo "Step 6: Running migrations..."
ssh $SERVER "cd ~/transport-management/backend && source env/bin/activate && python manage.py migrate"

echo "Step 7: Setting up systemd service..."
scp ./transportmgmtbe.service $SERVER:~/
ssh $SERVER "sudo cp ~/transportmgmtbe.service /etc/systemd/system/"
ssh $SERVER "sudo systemctl daemon-reload"
ssh $SERVER "sudo systemctl enable transportmgmtbe.service"

echo "Step 8: Setting up Nginx configuration for backend..."
scp ./transportmgmtbe.nginx $SERVER:~/
ssh $SERVER "sudo cp ~/transportmgmtbe.nginx /etc/nginx/sites-available/"
ssh $SERVER "sudo ln -sf /etc/nginx/sites-available/transportmgmtbe.nginx /etc/nginx/sites-enabled/"

echo "Step 9: Building frontend..."
cd ../frontend
npm install
npm run build

echo "Step 10: Copying frontend build to server..."
rsync -avz --delete dist/ $SERVER:/var/www/transportmanagemnt/frontend/dist/

echo "Step 11: Setting up Nginx configuration for frontend..."
cd ../deployment
scp ./transportmgmtfe.nginx $SERVER:~/
ssh $SERVER "sudo cp ~/transportmgmtfe.nginx /etc/nginx/sites-available/"
ssh $SERVER "sudo ln -sf /etc/nginx/sites-available/transportmgmtfe.nginx /etc/nginx/sites-enabled/"

echo "Step 12: Testing Nginx configuration..."
ssh $SERVER "sudo nginx -t"

echo "Step 13: Restarting services..."
ssh $SERVER "sudo systemctl restart transportmgmtbe.service"
ssh $SERVER "sudo systemctl restart nginx"

echo "Step 14: Checking service status..."
ssh $SERVER "sudo systemctl status transportmgmtbe.service --no-pager"

echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo "Frontend: http://103.65.21.176:5174/"
echo "Backend:  http://103.65.21.176:8003/"
echo ""
echo "To check logs:"
echo "  Backend:  ssh $SERVER 'sudo journalctl -u transportmgmtbe.service -f'"
echo "  Nginx:    ssh $SERVER 'sudo tail -f /var/log/nginx/transportmgmtbe-*.log'"
