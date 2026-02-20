#!/usr/bin/env python3
"""
Cyber Awareness Link Tracker - Web Email Sender
Simple web form to send test phishing emails
"""

from flask import Flask, request, render_template_string, jsonify
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import csv
import os
from datetime import datetime

app = Flask(__name__)

# Load name mapping
def load_recipients():
    """Load recipients from campaign CSV"""
    recipients = []
    csv_path = "campaigns/test_campaign_with_links.csv"
    try:
        if os.path.exists(csv_path):
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    recipients.append({
                        'name': row.get('name', 'Test User'),
                        'email': row.get('email', ''),
                        'tracking_id': row.get('tracking_id', ''),
                        'employee_id': row.get('employee_id', '')
                    })
    except:
        pass
    return recipients

def create_phishing_email(name, email, tracking_id, employee_id):
    """Create HTML phishing email"""
    
    tracking_url = f"https://www.patrickcorr.me/track?id={tracking_id}&url=https://portal.office.com"
    pixel_url = f"https://www.patrickcorr.me/pixel?id={employee_id}"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; padding: 20px; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 120px; height: 40px; background: #0078d4; margin: 0 auto; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">Microsoft</div>
        </div>
        
        <h2 style="color: #d83b01; text-align: center; margin-bottom: 30px;">⚠️ Security Alert</h2>
        
        <p style="font-size: 16px; line-height: 1.5;">Dear {name},</p>
        
        <p style="font-size: 16px; line-height: 1.5;">We detected <strong>unusual login activity</strong> on your Microsoft 365 account from an unrecognized device.</p>
        
        <div style="background: #fff4ce; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>📍 Location:</strong> Unknown (IP: 185.XXX.XXX.XXX)<br/>
                <strong>🕐 Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}<br/>
                <strong>💻 Device:</strong> Windows 10 / Chrome
            </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">For your security, please verify your account within <strong style="color: #d83b01;">24 hours</strong> or your account will be temporarily suspended.</p>
        
        <div style="text-align: center; margin: 35px 0;">
            <a href="{tracking_url}" 
               style="background: #0078d4; color: white; padding: 16px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,120,212,0.3);">
                🔐 Verify Account Now
            </a>
        </div>
        
        <p style="font-size: 13px; color: #666; margin-top: 30px; line-height: 1.5;">
            If you recognize this activity, you can <a href="#" style="color: #0078d4;">sign in to your account</a> and review recent activity. 
            If you don't recognize it, please secure your account immediately.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 35px 0;" />
        
        <div style="font-size: 11px; color: #999; text-align: center; line-height: 1.6;">
            <p style="margin: 0;">© 2026 Microsoft Corporation. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">One Microsoft Way, Redmond, WA 98052, USA</p>
        </div>
        
        <!-- INVISIBLE TRACKING PIXEL - Detects when email is opened -->
        <img src="{pixel_url}" width="1" height="1" alt="" style="display: none;" />
    </div>
</body>
</html>"""
    
    return html

@app.route('/email-sender')
def email_sender_page():
    """Web form to generate/send test emails"""
    
    recipients = load_recipients()
    
    recipient_options = ''.join([
        f'<option value="{r["email"]}" data-name="{r["name"]}" data-tracking="{r["tracking_id"]}" data-id="{r["employee_id"]}">{r["name"]} ({r["email"]})</option>'
        for r in recipients
    ])
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>📧 Cyber Tracker - Email Test Sender</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #0b0f1a; color: #e2e8f0; }}
            .container {{ max-width: 900px; margin: 40px auto; padding: 20px; }}
            h1 {{ color: #3b82f6; margin-bottom: 10px; }}
            .subtitle {{ color: #64748b; margin-bottom: 30px; }}
            .card {{ background: #1a1f2e; padding: 30px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; }}
            .form-group {{ margin-bottom: 20px; }}
            label {{ display: block; margin-bottom: 8px; color: #94a3b8; font-weight: 500; }}
            select, input {{ width: 100%; padding: 12px; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #e2e8f0; font-size: 14px; box-sizing: border-box; }}
            select:focus, input:focus {{ outline: none; border-color: #3b82f6; }}
            button {{ background: #3b82f6; color: white; padding: 14px 28px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }}
            button:hover {{ background: #2563eb; }}
            .code-block {{ background: #0f172a; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; border: 1px solid #334155; margin-top: 15px; white-space: pre-wrap; word-break: break-all; }}
            .copy-btn {{ background: #10b981; margin-left: 10px; padding: 8px 16px; font-size: 13px; }}
            .copy-btn:hover {{ background: #059669; }}
            .success {{ background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 15px; border-radius: 6px; margin-top: 15px; }}
            .info {{ background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; color: #3b82f6; padding: 15px; border-radius: 6px; margin-bottom: 20px; }}
            .steps {{ margin: 20px 0; }}
            .steps li {{ margin: 10px 0; color: #94a3b8; }}
            .preview-frame {{ width: 100%; height: 400px; border: 1px solid #334155; border-radius: 8px; background: white; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📧 Cyber Tracker - Email Test Sender</h1>
            <p class="subtitle">Generate and send test phishing emails with tracking</p>
            
            <div class="info">
                <strong>ℹ️ How it works:</strong> Select a recipient, generate the tracking email, then copy-paste into Gmail. 
                When they open the email or click the link, you'll see it on your dashboard with their name!
            </div>
            
            <div class="card">
                <h3 style="color: #3b82f6; margin-top: 0;">Step 1: Select Recipient</h3>
                
                <div class="form-group">
                    <label>Choose who to send the test to:</label>
                    <select id="recipient">
                        <option value="">-- Select a recipient --</option>
                        {recipient_options}
                        <option value="custom">+ Add custom email...</option>
                    </select>
                </div>
                
                <div class="form-group" id="customEmailGroup" style="display: none;">
                    <label>Custom Email Address:</label>
                    <input type="email" id="customEmail" placeholder="test@example.com">
                </div>
                
                <div class="form-group" id="customNameGroup" style="display: none;">
                    <label>Recipient Name:</label>
                    <input type="text" id="customName" placeholder="John Smith">
                </div>
                
                <button onclick="generateEmail()">✨ Generate Tracking Email</button>
            </div>
            
            <div id="result" style="display: none;">
                <div class="card">
                    <h3 style="color: #3b82f6; margin-top: 0;">Step 2: Copy Email HTML</h3>
                    
                    <div class="success" id="successMsg"></div>
                    
                    <p style="color: #94a3b8;">Copy this HTML code and paste it into Gmail:</p>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <button class="copy-btn" onclick="copyHTML()">📋 Copy HTML</button>
                    </div>
                    
                    <div class="code-block" id="htmlCode"></div>
                </div>
                
                <div class="card">
                    <h3 style="color: #3b82f6; margin-top: 0;">Step 3: Email Preview</h3>
                    <p style="color: #94a3b8;">This is what the recipient will see:</p>
                    <iframe class="preview-frame" id="previewFrame"></iframe>
                </div>
                
                <div class="card">
                    <h3 style="color: #3b82f6; margin-top: 0;">Step 4: Send & Track</h3>
                    
                    <ol class="steps">
                        <li>Open <strong>Gmail</strong> and click <strong>Compose</strong></li>
                        <li>Click the <strong>3 dots (⋮)</strong> → <strong>Insert HTML</strong></li>
                        <li>Paste the HTML code you copied above</li>
                        <li>Set subject: <code>⚠️ Action Required: Verify Your Microsoft 365 Account</code></li>
                        <li>Send to the recipient</li>
                        <li>Watch your dashboard update in real-time!<br/>
                            👉 <a href="/dashboard" target="_blank" style="color: #3b82f6;">Open Dashboard</a></li>
                    </ol>
                </div>
            </div>
        </div>
        
        <script>
            let currentHTML = '';
            
            document.getElementById('recipient').addEventListener('change', function() {{
                const isCustom = this.value === 'custom';
                document.getElementById('customEmailGroup').style.display = isCustom ? 'block' : 'none';
                document.getElementById('customNameGroup').style.display = isCustom ? 'block' : 'none';
            }});
            
            async function generateEmail() {{
                const select = document.getElementById('recipient');
                const option = select.options[select.selectedIndex];
                
                let email, name, trackingId, employeeId;
                
                if (select.value === 'custom') {{
                    email = document.getElementById('customEmail').value;
                    name = document.getElementById('customName').value || 'Test User';
                    trackingId = 'custom_' + Date.now();
                    employeeId = 'custom_' + Date.now();
                }} else if (select.value) {{
                    email = select.value;
                    name = option.dataset.name;
                    trackingId = option.dataset.tracking;
                    employeeId = option.dataset.id;
                }} else {{
                    alert('Please select a recipient');
                    return;
                }}
                
                // Generate email via API
                const response = await fetch('/api/generate-email', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{name, email, trackingId, employeeId}})
                }});
                
                const data = await response.json();
                currentHTML = data.html;
                
                document.getElementById('htmlCode').textContent = currentHTML;
                document.getElementById('previewFrame').srcdoc = currentHTML;
                document.getElementById('successMsg').innerHTML = `
                    ✅ Email generated for <strong>${{name}}</strong> (${{email}})<br>
                    <small>Tracking ID: ${{trackingId}}</small>
                `;
                document.getElementById('result').style.display = 'block';
                
                // Scroll to result
                document.getElementById('result').scrollIntoView({{behavior: 'smooth'}});
            }}
            
            function copyHTML() {{
                navigator.clipboard.writeText(currentHTML).then(() => {{
                    alert('✅ HTML copied to clipboard! Now paste into Gmail.');
                }});
            }}
        </script>
    </body>
    </html>
    """
    
    return render_template_string(html)

@app.route('/api/generate-email', methods=['POST'])
def generate_email_api():
    """API endpoint to generate email HTML"""
    data = request.get_json()
    
    html = create_phishing_email(
        name=data.get('name', 'Test User'),
        email=data.get('email', ''),
        tracking_id=data.get('trackingId', 'test_123'),
        employee_id=data.get('employeeId', 'test')
    )
    
    return jsonify({'html': html})

if __name__ == '__main__':
    print("Email Sender module - Run via tracker.py")
