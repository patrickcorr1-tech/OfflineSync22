#!/usr/bin/env python3
"""Send test phishing email via Gmail SMTP"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import sys

# Gmail SMTP settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "patrickcorr4@gmail.com"

# Test recipients with their tracking info
RECIPIENTS = [
    {
        "name": "Paddy",
        "email": "patrickcorr4@gmail.com",
        "tracking_id": "paddy001_2068e24e",
        "pixel_id": "paddy001"
    }
]

def create_phishing_email(recipient):
    """Create HTML phishing email with tracking"""
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = '⚠️ Action Required: Verify Your Microsoft 365 Account'
    msg['From'] = 'Microsoft 365 Security <security@microsoft-365-verify.com>'
    msg['To'] = recipient['email']
    
    tracking_url = f"https://www.patrickcorr.me/track?id={recipient['tracking_id']}&url=https://portal.office.com"
    pixel_url = f"https://www.patrickcorr.me/pixel?id={recipient['pixel_id']}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" width="120" />
            </div>
            
            <h2 style="color: #d83b01; text-align: center;">⚠️ Security Alert</h2>
            
            <p>Dear {recipient['name']},</p>
            
            <p>We detected <strong>unusual login activity</strong> on your Microsoft 365 account from an unrecognized device.</p>
            
            <div style="background: #fff4ce; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Location:</strong> Unknown (IP: 185.XXX.XXX.XXX)<br/>
                <strong>Time:</strong> 2026-02-13 09:45 UTC<br/>
                <strong>Device:</strong> Windows 10 / Chrome</p>
            </div>
            
            <p>For your security, please verify your account within <strong>24 hours</strong> or your account will be temporarily suspended.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{tracking_url}" 
                   style="background: #0078d4; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Verify Account Now
                </a>
            </div>
            
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
                If you recognize this activity, you can <a href="#">sign in to your account</a> and review recent activity.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="font-size: 11px; color: #999; text-align: center;">
                © 2026 Microsoft Corporation. All rights reserved.<br/>
                One Microsoft Way, Redmond, WA 98052, USA
            </p>
            
            <!-- Tracking Pixel -->
            <img src="{pixel_url}" width="1" height="1" />
        </div>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(html, 'html'))
    return msg

def send_email(password):
    """Send test email"""
    try:
        context = ssl.create_default_context()
        
        print("Connecting to Gmail SMTP...")
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SENDER_EMAIL, password)
            print(f"✅ Logged in as {SENDER_EMAIL}")
            
            for recipient in RECIPIENTS:
                print(f"\nSending to {recipient['name']} ({recipient['email']})...")
                msg = create_phishing_email(recipient)
                server.sendmail(SENDER_EMAIL, recipient['email'], msg.as_string())
                print(f"✅ Email sent!")
                print(f"   Tracking ID: {recipient['tracking_id']}")
                print(f"   Pixel ID: {recipient['pixel_id']}")
                print(f"   Dashboard: https://www.patrickcorr.me/dashboard")
                
        print("\n🎉 All emails sent successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nNote: For Gmail, you need an App Password (not your regular password)")
        print("Create one at: https://myaccount.google.com/apppasswords")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🔒 Cyber Awareness Test Email Sender")
    print("=" * 60)
    print(f"From: {SENDER_EMAIL}")
    print(f"To: Paddy ({RECIPIENTS[0]['email']})")
    print("=" * 60)
    print()
    
    # Get password from command line or prompt
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        print("Usage: python3 send_test_email.py YOUR_APP_PASSWORD")
        print("\nTo get an App Password:")
        print("1. Go to https://myaccount.google.com/apppasswords")
        print("2. Generate a new app password for 'Mail'")
        print("3. Copy the 16-character password")
        sys.exit(1)
    
    send_email(password)
