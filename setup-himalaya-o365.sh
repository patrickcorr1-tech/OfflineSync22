#!/bin/bash
# Configure Himalaya for Office 365
# Run: ./setup-himalaya-o365.sh

echo "======================================"
echo "📧 Office 365 Email Setup for Himalaya"
echo "======================================"
echo ""
echo "For Office 365 with MFA enabled, you need an App Password:"
echo ""
echo "1. Go to: https://account.microsoft.com/security"
echo "2. Sign in with your Microsoft account"
echo "3. Click 'Advanced security options'"
echo "4. Under 'App passwords', click 'Create a new app password'"
echo "5. Name it 'Himalaya CLI'"
echo "6. COPY the 16-character password shown"
echo ""
read -p "Press Enter when you have your App Password..."
echo ""

# Get user details
read -p "Your Office 365 email (e.g., you@company.com): " EMAIL
read -p "Your display name (e.g., Paddy Corr): " NAME
read -sp "Paste your App Password (hidden): " APP_PASSWORD
echo ""

# Create config directory
mkdir -p ~/.config/himalaya

# Write config
cat > ~/.config/himalaya/config.toml <> EOF
# Himalaya configuration for Office 365
# Generated: $(date)

[accounts.default]
# Display name shown in sent emails
default = true
email = "$EMAIL"
display-name = "$NAME"

# IMAP (Receiving emails)
[accounts.default.backend.imap]
host = "outlook.office365.com"
port = 993
encryption = "tls"
login = "$EMAIL"
auth.type = "password"
auth.raw = "$APP_PASSWORD"

# SMTP (Sending emails)
[accounts.default.backend.smtp]
host = "smtp.office365.com"
port = 587
encryption = "starttls"
login = "$EMAIL"
auth.type = "password"
auth.raw = "$APP_PASSWORD"

# Message cache for faster access
[accounts.default.message.cache]
backend = "maildir"
dir = "~/.cache/himalaya/maildir"
EOF

echo ""
echo "✅ Configuration saved to ~/.config/himalaya/config.toml"
echo ""
echo "Testing connection..."
echo ""

# Test IMAP
himalaya envelope list --account default --page-size 5 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Email is working!"
    echo ""
    echo "Useful commands:"
    echo "  himalaya envelope list          # List emails"
    echo "  himalaya envelope read 1        # Read email #1"
    echo "  himalaya account configure      # Reconfigure"
else
    echo ""
    echo "❌ Connection failed. Check your App Password and try again."
    echo "You can re-run this script: ./setup-himalaya-o365.sh"
fi
