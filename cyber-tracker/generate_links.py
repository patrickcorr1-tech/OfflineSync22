#!/usr/bin/env python3
"""
Generate unique tracking links for email campaign
"""

import csv
import uuid
import sys
import os
from urllib.parse import quote

# Configuration
BASE_TRACKING_URL = "https://www.patrickcorr.me/track"  # CHANGE THIS

def generate_tracking_id(employee_id):
    """Generate unique tracking ID for recipient"""
    random_part = uuid.uuid4().hex[:8]
    return f"{employee_id}_{random_part}"

def generate_tracking_link(tracking_id, target_url):
    """Generate full tracking URL"""
    encoded_url = quote(target_url, safe='')
    return f"{BASE_TRACKING_URL}?id={tracking_id}&url={encoded_url}"

def process_campaign(campaign_file):
    """Process campaign CSV and generate tracking links"""
    
    output_file = campaign_file.replace('.csv', '_with_links.csv')
    
    with open(campaign_file, 'r') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames + ['tracking_id', 'tracking_link']
        
        rows = []
        for row in reader:
            # Generate tracking ID
            emp_id = row.get('employee_id', row.get('email', 'unknown'))
            tracking_id = generate_tracking_id(emp_id)
            
            # Get target URL (can be specified in CSV or use default)
            target_url = row.get('target_url', 'https://portal.office.com')
            
            # Generate tracking link
            tracking_link = generate_tracking_link(tracking_id, target_url)
            
            row['tracking_id'] = tracking_id
            row['tracking_link'] = tracking_link
            rows.append(row)
            
            print(f"✅ {row.get('name', emp_id)}: {tracking_link}")
    
    # Write output
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"\n📁 Saved to: {output_file}")
    print(f"📊 Total recipients: {len(rows)}")
    
    return output_file

if __name__ == '__main__':
    # Default campaign file
    campaign_file = sys.argv[1] if len(sys.argv) > 1 else 'campaigns/example_campaign.csv'
    
    if not os.path.exists(campaign_file):
        print(f"❌ File not found: {campaign_file}")
        print("Creating example campaign file...")
        
        os.makedirs('campaigns', exist_ok=True)
        
        # Create example campaign
        example = """employee_id,email,name,department,target_url
emp001,john.smith@company.com,John Smith,Engineering,https://portal.office.com
emp002,jane.doe@company.com,Jane Doe,HR,https://portal.office.com
emp003,bob.wilson@company.com,Bob Wilson,Sales,https://portal.office.com
"""
        with open(campaign_file, 'w') as f:
            f.write(example)
        
        print(f"✅ Created example: {campaign_file}")
        print("Edit this file with your recipients, then run again.")
        sys.exit(0)
    
    print("=" * 60)
    print("🔗 Cyber Tracker - Link Generator")
    print("=" * 60)
    print(f"Base URL: {BASE_TRACKING_URL}")
    print(f"Campaign: {campaign_file}")
    print("=" * 60)
    print()
    
    output = process_campaign(campaign_file)
    
    print()
    print("=" * 60)
    print("📧 Next Steps:")
    print("=" * 60)
    print("1. Open the output CSV file")
    print("2. Copy tracking_link column into your email template")
    print("3. Send phishing simulation emails")
    print("4. View clicks at: http://your-server:5000/dashboard")
    print("=" * 60)
