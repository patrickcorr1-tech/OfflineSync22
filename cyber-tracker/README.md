# Cyber Awareness Link Tracker v2

Advanced email link tracking system for phishing simulations and security awareness training.

## ✨ Features

- **Link Click Tracking** - Track when recipients click phishing links
- **Email Open Tracking** - Track when emails are opened (invisible pixel)
- **Geolocation** - Country, city, and ISP for each event
- **Real-time Dashboard** - View clicks and opens with location data
- **CSV Export** - Export all data for analysis

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd /home/admin/.openclaw/workspace/cyber-tracker
pip3 install flask requests
```

### 2. Edit tracker.py - Set your domain
```python
# In tracker.py, update this line for pixel tracking:
# Use your actual domain where tracker will run
```

### 3. Start the tracker
```bash
python3 tracker.py
```

### 4. View dashboard
Open: `http://patrickcorr.me:5000/dashboard`

## 📊 Tracking Types

### 1. Link Click Tracking

**Generate tracking links:**
```bash
python3 generate_links.py campaigns/your_campaign.csv
```

**Link format:**
```
https://patrickcorr.me/track?id=emp001_abc123&url=https://portal.office.com
```

**What gets logged:**
- Timestamp
- Employee ID
- IP Address
- Geolocation (Country, City, ISP)
- Target URL clicked
- User Agent

### 2. Email Open Tracking

**Add tracking pixel to HTML emails:**
```html
<img src="https://patrickcorr.me/pixel?id=emp001" width="1" height="1" />
```

**What gets logged:**
- Timestamp when email was opened
- Employee ID
- IP Address
- Geolocation
- Device info (from User-Agent)

## 📁 File Structure

```
.
├── tracker.py              # Main tracking server
├── generate_links.py       # Generate tracking URLs
├── campaigns/
│   └── example_campaign.csv   # Recipient list
├── clicks.log              # Click events (JSON)
├── opens.log               # Email open events (JSON)
└── README.md
```

## 📈 Dashboard

View at `/dashboard`:

**Stats:**
- Total Clicks
- Email Opens
- Unique Clickers
- Unique Openers
- Countries breakdown

**Tabs:**
- **Clicks** - Who clicked phishing links
- **Opens** - Who opened the emails

**Location Data:**
- Country
- City
- ISP/Organization

## 📤 Export Data

**CSV Export:**
```
http://patrickcorr.me:5000/api/export/csv
```

**JSON API:**
```
http://patrickcorr.me:5000/api/clicks
```

## 📝 Campaign CSV Format

```csv
employee_id,email,name,department,target_url
emp001,john@company.com,John Smith,Engineering,https://portal.office.com
emp002,jane@company.com,Jane Doe,HR,https://portal.office.com
```

## 🔒 Security Notes

- IDs are random and hard to guess
- No passwords stored
- IP logging can be disabled
- Uses free ip-api.com for geolocation (no API key needed)
- GDPR compliant (don't store PII without consent)

## 🎯 Example Email Template

```html
<html>
<body>
  <h2>Important: Action Required</h2>
  <p>Please verify your account:</p>
  <a href="https://patrickcorr.me/track?id=EMP001&url=https://portal.office.com">
    Click here to verify
  </a>
  
  <!-- Tracking pixel -->
  <img src="https://patrickcorr.me/pixel?id=EMP001" width="1" height="1" />
</body>
</html>
```

## 📊 Metrics You Can Track

1. **Open Rate** - % who opened the email
2. **Click Rate** - % who clicked the link
3. **Geographic Spread** - Where users are located
4. **Device Types** - Mobile vs Desktop
5. **ISP/Organization** - Corporate vs Home networks
