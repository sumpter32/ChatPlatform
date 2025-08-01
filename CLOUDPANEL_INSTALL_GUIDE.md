# 🚀 Super Easy CloudPanel Installation Guide for chat.wwjs.app

This guide will help you install ChatPlatform on CloudPanel step by step!

## 📋 What You'll Need:
- CloudPanel with Ubuntu 24.04
- Domain: chat.wwjs.app (already pointed to your server)
- About 30 minutes

---

## Step 1: Create Your Site in CloudPanel 🌐

1. **Login to CloudPanel**
2. **Click "Add Site"**
3. **Choose "Node.js" type**
4. Fill in:
   - Domain Name: `chat.wwjs.app`
   - Node.js Version: 18 or higher
   - App Port: `3020`
5. **Click "Create"**

---

## Step 2: Create Database 🗄️

1. In CloudPanel, go to **"Databases"**
2. Click **"Add Database"**
3. Fill in:
   - Database Name: `chatplatform`
   - User Name: `chatplatform`
   - Password: Stvn_2484
4. Click **"Create"**

---

## Step 3: Upload Your Files 📁

1. **Connect via SSH** to your server:
   ```bash
   ssh root@your-server-ip
   ```

2. **Go to your site directory**:
   ```bash
   cd /home/wwjs-chat/htdocs/chat.wwjs.app
   ```

3. **Clone the repository**:
   ```bash
   git clone https://github.com/sumpter32/ChatPlatform.git
   ```

4. **Enter the ChatPlatform directory**:
   ```bash
   cd ChatPlatform
   ```

---

## Step 4: Make Scripts Executable 🔧

```bash
chmod +x cloudpanel-install.sh
chmod +x setup-database.sh
chmod +x start-production.sh
```

---

## Step 5: Run Installation Script 📦

```bash
./cloudpanel-install.sh
```

This will:
- Install all dependencies
- Build the frontend
- Create necessary folders
- Set up your .env file

---

## Step 6: Configure Your Settings ⚙️

1. **Edit the .env file**:
   ```bash
   nano .env
   ```

2. **Update these values**:
   ```
   DB_PASSWORD=your_database_password_from_step_2
   JWT_SECRET=create_a_random_32_character_string_here
   ```
   
   💡 **Tip**: Generate a random string at: https://passwordsgenerator.net/

3. **Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 7: Set Up Database 🗄️

```bash
./setup-database.sh
```

This creates all the necessary tables!

---

## Step 8: Create Admin User 👤

```bash
cd backend
node create-admin.js
```

Enter:
- Name: Your Name
- Email: your-email@example.com
- Password: (choose a strong password)

---

## Step 9: Configure Nginx in CloudPanel 🌐

1. In CloudPanel, go to your site settings
2. Click on **"Vhost"**
3. Find the `location /` block
4. **Replace it** with the contents from `vhost-nginx.conf`
5. **Important**: Replace `YOUR_CLOUDPANEL_USER` with `wwjs-chat`
6. Click **"Save"**

---

## Step 10: Start Your App! 🚀

```bash
cd /home/wwjs-chat/htdocs/chat.wwjs.app/ChatPlatform
./start-production.sh
```

---

## Step 11: Enable SSL Certificate 🔒

1. In CloudPanel, go to your site
2. Click **"SSL/TLS"**
3. Click **"Actions" → "New Let's Encrypt Certificate"**
4. Check **"Force HTTPS redirect"**
5. Click **"Create"**

---

## ✅ You're Done!

Visit https://chat.wwjs.app and you should see your ChatPlatform!

**Default login**:
- Use the admin account you created in Step 8

---

## 🔧 Troubleshooting

### Site not loading?
```bash
# Check if backend is running
pm2 status

# View logs
pm2 logs

# Restart backend
pm2 restart all
```

### Database connection error?
- Double-check your .env file has correct database credentials
- Make sure database user has all privileges

### 502 Bad Gateway?
- Backend might not be running
- Check with: `pm2 status`
- Start with: `pm2 start ecosystem.config.js`

---

## 📱 Next Steps

1. **Configure your AI settings** in Admin Panel
2. **Add custom agents** for your use case
3. **Customize branding** with your logo and colors
4. **Set up Open WebUI** if you want local AI models

---

## 🆘 Need Help?

- Check logs: `pm2 logs`
- Backend logs: `tail -f logs/pm2-error.log`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`

Remember to:
- Keep your .env file secure
- Regularly backup your database
- Update your JWT_SECRET to something unique

Good luck! 🎉