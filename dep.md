cd /var/www/openway
git pull origin main
cd frontend
npm install
npm run build
sudo systemctl reload nginx
pm2 restart openway-backend
pm2 status
pm2 logs openway-backend --lines 30




sudo systemctl restart nginx