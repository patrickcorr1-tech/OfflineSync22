#!/usr/bin/env python3
"""
Cyber Awareness Link Tracker v3 - With Visual Analytics
Tracks email link clicks + email opens + geolocation + Charts
"""

from flask import Flask, request, redirect, render_template_string, jsonify, send_file
import json
import csv
import uuid
import requests
from datetime import datetime, timedelta
from urllib.parse import quote, unquote
import os
import base64

app = Flask(__name__)

# Configuration
LOG_FILE = "clicks.log"
OPENS_LOG = "opens.log"
CAMPAIGNS_DIR = "campaigns"
CAMPAIGN_CSV = "campaigns/test_campaign_with_links.csv"

# Base64 encoded 1x1 transparent GIF pixel
PIXEL_GIF = base64.b64decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')

def load_name_mapping():
    """Load employee ID to name mapping from campaign CSV"""
    names = {}
    try:
        if os.path.exists(CAMPAIGN_CSV):
            with open(CAMPAIGN_CSV, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    emp_id = row.get('employee_id', '')
                    name = row.get('name', emp_id)
                    tracking_id = row.get('tracking_id', '')
                    # Map both base ID and full tracking ID to name
                    names[emp_id] = name
                    names[tracking_id] = name
                    # Also map pixel ID (without random suffix)
                    if '_' in tracking_id:
                        base_id = tracking_id.split('_')[0]
                        names[base_id] = name
    except Exception as e:
        print(f"[NAMES] Error loading names: {e}")
    return names

def get_geolocation(ip_address):
    """Get geolocation from IP address using ip-api.com"""
    try:
        if ip_address.startswith(('192.168.', '10.', '172.16.', '127.')):
            return {"country": "Local", "city": "Local Network", "isp": "Private"}
        
        response = requests.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,city,isp,org", timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    "country": data.get('country', 'Unknown'),
                    "city": data.get('city', 'Unknown'),
                    "isp": data.get('isp', 'Unknown'),
                    "org": data.get('org', 'Unknown')
                }
    except Exception as e:
        print(f"[GEO] Error: {e}")
    
    return {"country": "Unknown", "city": "Unknown", "isp": "Unknown"}

def log_click(tracking_id, target_url, ip_address, user_agent, referrer):
    """Log a click event with geolocation"""
    timestamp = datetime.utcnow().isoformat()
    geo = get_geolocation(ip_address)
    
    log_entry = {
        "event_type": "click",
        "timestamp": timestamp,
        "tracking_id": tracking_id,
        "target_url": target_url,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "referrer": referrer,
        "country": geo.get('country'),
        "city": geo.get('city'),
        "isp": geo.get('isp')
    }
    
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    print(f"[CLICK] {tracking_id} from {geo.get('city')}, {geo.get('country')}")
    return log_entry

def log_email_open(tracking_id, ip_address, user_agent):
    """Log email open event with geolocation"""
    timestamp = datetime.utcnow().isoformat()
    geo = get_geolocation(ip_address)
    
    log_entry = {
        "event_type": "open",
        "timestamp": timestamp,
        "tracking_id": tracking_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "country": geo.get('country'),
        "city": geo.get('city'),
        "isp": geo.get('isp')
    }
    
    with open(OPENS_LOG, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    print(f"[OPEN] {tracking_id} from {geo.get('city')}, {geo.get('country')}")
    return log_entry

@app.route('/track')
def track_click():
    """Main tracking endpoint"""
    tracking_id = request.args.get('id', 'unknown')
    target_url = request.args.get('url', '')
    
    if not target_url:
        return "Error: No target URL", 400
    
    target_url = unquote(target_url)
    
    log_click(
        tracking_id=tracking_id,
        target_url=target_url,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent', 'Unknown'),
        referrer=request.headers.get('Referer', 'Direct')
    )
    
    return redirect(target_url)

@app.route('/pixel')
def tracking_pixel():
    """Email open tracking pixel"""
    tracking_id = request.args.get('id', 'unknown')
    
    log_email_open(
        tracking_id=tracking_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent', 'Unknown')
    )
    
    return send_file(
        io.BytesIO(PIXEL_GIF),
        mimetype='image/gif',
        as_attachment=False
    )

import io

@app.route('/dashboard')
def dashboard():
    """Visual analytics dashboard with names"""
    clicks = []
    opens = []
    unique_clickers = set()
    unique_openers = set()
    
    # Load name mapping
    name_map = load_name_mapping()
    
    # Load clicks
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get('event_type') == 'click':
                        # Add name to event
                        tid = event['tracking_id']
                        event['name'] = name_map.get(tid) or name_map.get(tid.split('_')[0]) or tid
                        clicks.append(event)
                        unique_clickers.add(tid)
                except:
                    continue
    
    # Load opens
    if os.path.exists(OPENS_LOG):
        with open(OPENS_LOG, "r") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get('event_type') == 'open':
                        # Add name to event
                        tid = event['tracking_id']
                        event['name'] = name_map.get(tid) or name_map.get(tid.split('_')[0]) or tid
                        opens.append(event)
                        unique_openers.add(tid)
                except:
                    continue
    
    clicks.reverse()
    opens.reverse()
    
    total_clicks = len(clicks)
    total_opens = len(opens)
    
    # Prepare chart data
    countries = {}
    hourly_clicks = {}
    hourly_opens = {}
    
    for event in clicks + opens:
        country = event.get('country', 'Unknown')
        countries[country] = countries.get(country, 0) + 1
        
        # Hourly breakdown
        hour = event['timestamp'][11:13] if len(event['timestamp']) > 13 else '00'
        if event['event_type'] == 'click':
            hourly_clicks[hour] = hourly_clicks.get(hour, 0) + 1
        else:
            hourly_opens[hour] = hourly_opens.get(hour, 0) + 1
    
    # ISP breakdown
    isps = {}
    for event in clicks + opens:
        isp = event.get('isp', 'Unknown')[:30]
        isps[isp] = isps.get(isp, 0) + 1
    
    # Prepare JSON data for charts
    chart_data = {
        "clicks": total_clicks,
        "opens": total_opens,
        "countries": countries,
        "isps": dict(sorted(isps.items(), key=lambda x: x[1], reverse=True)[:10]),
        "hourly_clicks": hourly_clicks,
        "hourly_opens": hourly_opens
    }
    
    html = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Cyber Tracker Analytics Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #0b0f1a; color: #e2e8f0; }
            h1 { color: #3b82f6; margin-bottom: 10px; }
            .subtitle { color: #64748b; margin-bottom: 30px; }
            
            /* Navigation Tabs */
            .tabs { display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid #334155; }
            .tab { padding: 12px 24px; cursor: pointer; background: #1a1f2e; border-radius: 8px 8px 0 0; border: none; color: #94a3b8; font-size: 14px; font-weight: 600; }
            .tab.active { background: #3b82f6; color: white; }
            .tab:hover:not(.active) { background: #1e293b; color: #e2e8f0; }
            
            /* Tab Content */
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            
            /* Stats Boxes */
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-box { background: linear-gradient(135deg, #1a1f2e, #0f172a); padding: 25px; border-radius: 12px; border: 1px solid #334155; text-align: center; }
            .stat-box.danger { border-color: #dc2626; background: linear-gradient(135deg, #1a1f2e, #450a0a); }
            .stat-box.warning { border-color: #f59e0b; background: linear-gradient(135deg, #1a1f2e, #451a03); }
            .stat-box.info { border-color: #3b82f6; background: linear-gradient(135deg, #1a1f2e, #172554); }
            .stat-number { font-size: 42px; font-weight: bold; color: #3b82f6; margin: 10px 0; }
            .stat-box.danger .stat-number { color: #dc2626; }
            .stat-box.warning .stat-number { color: #f59e0b; }
            .stat-box.info .stat-number { color: #10b981; }
            .stat-label { color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            
            /* High Risk Section */
            .high-risk-section { background: linear-gradient(135deg, #450a0a, #1a1f2e); border: 2px solid #dc2626; border-radius: 12px; padding: 30px; margin: 30px 0; }
            .high-risk-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
            .high-risk-header h2 { color: #dc2626; margin: 0; font-size: 24px; }
            .high-risk-badge { background: #dc2626; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            
            /* Event Tables */
            .event-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            .event-table th { background: #1e293b; color: #3b82f6; padding: 14px; text-align: left; font-weight: 600; }
            .event-table td { padding: 12px 14px; border-bottom: 1px solid #334155; }
            .event-table tr:hover { background: #1e293b; }
            .event-table tr.high-risk { background: rgba(220, 38, 38, 0.1); }
            .event-table tr.high-risk:hover { background: rgba(220, 38, 38, 0.2); }
            
            /* Badges */
            .badge { padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .badge-click { background: #dc2626; color: white; }
            .badge-open { background: #10b981; color: white; }
            .badge-risk { background: #f59e0b; color: #451a03; }
            
            /* Charts */
            .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin: 30px 0; }
            .chart-box { background: #1a1f2e; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
            .chart-title { color: #3b82f6; font-size: 16px; margin-bottom: 15px; font-weight: 600; }
            
            /* Actions */
            .actions { margin: 20px 0; }
            .btn { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; margin-right: 10px; font-size: 14px; }
            .btn:hover { background: #2563eb; }
            .btn-danger { background: #dc2626; }
            .btn-danger:hover { background: #b91c1c; }
            
            /* Info Boxes */
            .info-box { background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .warning-box { background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            
            /* Geo text */
            .geo { color: #94a3b8; font-size: 12px; }
            
            /* User Name */
            .user-name { font-weight: 600; color: #e2e8f0; }
            .user-name.high-risk { color: #fca5a5; }
            
            /* Section Headers */
            .section-header { display: flex; align-items: center; gap: 10px; margin: 30px 0 20px; padding-bottom: 10px; border-bottom: 2px solid #334155; }
            .section-header h2 { margin: 0; color: #e2e8f0; }
            .section-header.opens { border-color: #10b981; }
            .section-header.clicks { border-color: #dc2626; }
        </style>
    </head>
    <body>
        <h1>🔒 Cyber Awareness Analytics Dashboard</h1>
        <p class="subtitle">Real-time phishing simulation tracking - Monitor email opens and identify high-risk users who click</p>
        
        <div class="actions">
            <button class="btn" onclick="location.reload()">🔄 Refresh</button>
            <a href="/api/export/csv" class="btn">📥 Export CSV</a>
            <a href="/api/clicks" class="btn" target="_blank">📡 API</a>
        </div>
        
        <!-- Summary Stats -->
        <div class="stats">
            <div class="stat-box danger">
                <div class="stat-label">⚠️ Link Clicks (Failed)</div>
                <div class="stat-number">''' + str(total_clicks) + '''</div>
            </div>
            <div class="stat-box info">
                <div class="stat-label">📧 Email Opens</div>
                <div class="stat-number">''' + str(total_opens) + '''</div>
            </div>
            <div class="stat-box danger">
                <div class="stat-label">🚨 High Risk Users</div>
                <div class="stat-number">''' + str(len(unique_clickers)) + '''</div>
            </div>
            <div class="stat-box warning">
                <div class="stat-label">👥 Unique Openers</div>
                <div class="stat-number">''' + str(len(unique_openers)) + '''</div>
            </div>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="tabs">
            <div class="tab active" onclick="showTab('overview')">📊 Overview</div>
            <div class="tab" onclick="showTab('highrisk')">🚨 High Risk Users</div>
            <div class="tab" onclick="showTab('opens')">📧 Email Opens</div>
            <div class="tab" onclick="showTab('clicks')">⚠️ Click Events</div>
        </div>
        
        <!-- Overview Tab -->
        <div id="overview" class="tab-content active">
            <div class="charts">
                <div class="chart-box">
                    <div class="chart-title">📊 Clicks vs Opens</div>
                    <canvas id="pieChart"></canvas>
                </div>
                
                <div class="chart-box">
                    <div class="chart-title">🌍 Events by Country</div>
                    <canvas id="countryChart"></canvas>
                </div>
                
                <div class="chart-box">
                    <div class="chart-title">📈 Activity Timeline (24h)</div>
                    <canvas id="timelineChart"></canvas>
                </div>
                
                <div class="chart-box">
                    <div class="chart-title">🏢 Top ISPs/Organizations</div>
                    <canvas id="ispChart"></canvas>
                </div>
            </div>
            
            <div class="info-box">
                <h3>📋 Dashboard Guide</h3>
                <p><strong>Email Opens:</strong> Users who opened the email (tracked via pixel). This is normal behavior and not a failure.</p>
                <p><strong>Link Clicks:</strong> Users who clicked the phishing link. These are <strong>High Risk Users</strong> who need cybersecurity training.</p>
                <p><strong>High Risk Users:</strong> Anyone who clicked should be enrolled in additional security awareness training.</p>
            </div>
        </div>
        
        <!-- High Risk Users Tab -->
        <div id="highrisk" class="tab-content">
            <div class="high-risk-section">
                <div class="high-risk-header">
                    <h2>🚨 HIGH RISK USERS</h2>
                    <span class="high-risk-badge">''' + str(len(unique_clickers)) + ''' USERS NEED TRAINING</span>
                </div>
                <p style="color: #fca5a5; margin-bottom: 20px;">These users clicked on the phishing link. They should be enrolled in cybersecurity awareness training.</p>
                
                <table class="event-table">
                    <tr>
                        <th>Time</th>
                        <th>Name</th>
                        <th>Risk Level</th>
                        <th>Location</th>
                        <th>ISP/Device</th>
                    </tr>
                    ''' + ''.join([
                        f"<tr class='high-risk'><td>{e['timestamp'][11:19]}</td><td class='user-name high-risk'>{e.get('name', 'Unknown')}</td><td><span class='badge badge-click'>HIGH RISK - CLICKED</span></td><td class='geo'>{e.get('city', 'Unknown')}, {e.get('country', 'Unknown')}</td><td class='geo'>{e.get('isp', 'Unknown')[:25]}</td></tr>"
                        for e in clicks[:50]
                    ]) + '''
                </table>
            </div>
            
            <div class="warning-box">
                <h3>⚠️ Recommended Actions</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #fbbf24;">
                    <li>Schedule mandatory cybersecurity training for all High Risk Users</li>
                    <li>Send follow-up educational email about phishing red flags</li>
                    <li>Consider additional MFA requirements for these users</li>
                    <li>Retest in 30 days to measure improvement</li>
                </ul>
            </div>
        </div>
        
        <!-- Email Opens Tab -->
        <div id="opens" class="tab-content">
            <div class="section-header opens">
                <h2>📧 Email Opens Tracking</h2>
                <span style="color: #10b981; font-size: 14px;">Users who opened the email (not a failure - just tracking)</span>
            </div>
            
            <div class="info-box">
                <p><strong>Note:</strong> Opening an email is normal behavior. These users are NOT high risk - they just opened the email. Only users who click the link are flagged as high risk.</p>
            </div>
            
            <table class="event-table">
                <tr>
                    <th>Time</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>ISP/Device</th>
                </tr>
                ''' + ''.join([
                    f"<tr><td>{e['timestamp'][11:19]}</td><td class='user-name'>{e.get('name', 'Unknown')}</td><td><span class='badge badge-open'>OPENED EMAIL</span></td><td class='geo'>{e.get('city', 'Unknown')}, {e.get('country', 'Unknown')}</td><td class='geo'>{e.get('isp', 'Unknown')[:25]}</td></tr>"
                    for e in opens[:50]
                ]) + '''
            </table>
        </div>
        
        <!-- Click Events Tab -->
        <div id="clicks" class="tab-content">
            <div class="section-header clicks">
                <h2>⚠️ Link Click Events (Failed Test)</h2>
                <span style="color: #dc2626; font-size: 14px;">Users who clicked the phishing link - SECURITY FAILURE</span>
            </div>
            
            <div class="warning-box">
                <p style="color: #fbbf24; margin: 0;"><strong>🚨 WARNING:</strong> These users clicked on a phishing link. This represents a security failure and they should be enrolled in training.</p>
            </div>
            
            <table class="event-table">
                <tr>
                    <th>Time</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>ISP/Device</th>
                </tr>
                ''' + ''.join([
                    f"<tr class='high-risk'><td>{e['timestamp'][11:19]}</td><td class='user-name high-risk'>{e.get('name', 'Unknown')}</td><td><span class='badge badge-click'>CLICKED LINK - FAILED</span></td><td class='geo'>{e.get('city', 'Unknown')}, {e.get('country', 'Unknown')}</td><td class='geo'>{e.get('isp', 'Unknown')[:25]}</td></tr>"
                    for e in clicks[:50]
                ]) + '''
            </table>
        </div>
        
        <script>
            const chartData = ''' + json.dumps(chart_data) + ''';
            
            // Tab switching
            function showTab(tabName) {
                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                
                // Show selected tab
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');
            }
            
            // Pie Chart - Clicks vs Opens
            new Chart(document.getElementById('pieChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Clicks (Failed)', 'Opens (Tracked)'],
                    datasets: [{
                        data: [chartData.clicks, chartData.opens],
                        backgroundColor: ['#dc2626', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#e2e8f0' } }
                    }
                }
            });
            
            // Bar Chart - Countries
            const countryLabels = Object.keys(chartData.countries);
            const countryData = Object.values(chartData.countries);
            new Chart(document.getElementById('countryChart'), {
                type: 'bar',
                data: {
                    labels: countryLabels,
                    datasets: [{
                        label: 'Events',
                        data: countryData,
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                    }
                }
            });
            
            // Line Chart - Timeline
            const hours = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
            const clickData = hours.map(h => chartData.hourly_clicks[h] || 0);
            const openData = hours.map(h => chartData.hourly_opens[h] || 0);
            
            new Chart(document.getElementById('timelineChart'), {
                type: 'line',
                data: {
                    labels: hours.map(h => h + ':00'),
                    datasets: [
                        {
                            label: 'Clicks (Failed)',
                            data: clickData,
                            borderColor: '#dc2626',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Opens (Tracked)',
                            data: openData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { labels: { color: '#e2e8f0' } } },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                    }
                }
            });
            
            // Horizontal Bar - ISPs
            const ispLabels = Object.keys(chartData.isps);
            const ispData = Object.values(chartData.isps);
            new Chart(document.getElementById('ispChart'), {
                type: 'bar',
                data: {
                    labels: ispLabels,
                    datasets: [{
                        label: 'Events',
                        data: ispData,
                        backgroundColor: '#8b5cf6'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                        y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                    }
                }
            });
        </script>
    </body>
    </html>
    '''
    
    return render_template_string(html)

@app.route('/api/clicks')
def api_clicks():
    """API endpoint to get all events as JSON"""
    events = []
    for log_file in [LOG_FILE, OPENS_LOG]:
        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                for line in f:
                    try:
                        events.append(json.loads(line.strip()))
                    except:
                        continue
    return jsonify(events)

@app.route('/api/export/csv')
def export_csv():
    """Export all events as CSV"""
    events = []
    for log_file in [LOG_FILE, OPENS_LOG]:
        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                for line in f:
                    try:
                        events.append(json.loads(line.strip()))
                    except:
                        continue
    
    output = ["event_type,timestamp,tracking_id,ip_address,country,city,isp,user_agent,target_url"]
    for event in events:
        row = f"{event.get('event_type')},{event.get('timestamp')},{event.get('tracking_id')},{event.get('ip_address')},{event.get('country')},{event.get('city')},{event.get('isp')},\"{event.get('user_agent', '')}\",{event.get('target_url', '')}"
        output.append(row)
    
    return '\n'.join(output), 200, {'Content-Type': 'text/csv'}

@app.route('/api/export/pdf')
def export_pdf():
    """Generate PDF report"""
    clicks = []
    opens = []
    
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get('event_type') == 'click':
                        clicks.append(event)
                except:
                    continue
    
    if os.path.exists(OPENS_LOG):
        with open(OPENS_LOG, "r") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get('event_type') == 'open':
                        opens.append(event)
                except:
                    continue
    
    # Generate simple HTML report that can be printed to PDF
    report_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Phishing Simulation Report</title>
        <style>
            @media print {{
                body {{ padding: 20px; }}
                .no-print {{ display: none; }}
            }}
            body {{ font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; background: white; }}
            h1 {{ color: #1a365d; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; }}
            .summary {{ background: #f3f4f6; padding: 25px; border-radius: 10px; margin: 25px 0; }}
            .stat-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }}
            .stat-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            .stat-number {{ font-size: 36px; font-weight: bold; color: #dc2626; }}
            .stat-label {{ color: #6b7280; font-size: 14px; margin-top: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 25px 0; }}
            th {{ background: #1e3a5f; color: white; padding: 12px; text-align: left; }}
            td {{ padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }}
            tr:nth-child(even) {{ background: #f9fafb; }}
            .high-risk {{ color: #dc2626; font-weight: bold; }}
            .section {{ margin: 35px 0; }}
            .recommendations {{ background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; }}
            .btn {{ background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }}
            .btn:hover {{ background: #2563eb; }}
            .date {{ color: #6b7280; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px;">
            <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <a href="/dashboard" class="btn" style="text-decoration: none; margin-left: 10px;">← Back to Dashboard</a>
        </div>
        
        <h1>🔒 Phishing Simulation Report</h1>
        <p class="date">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        
        <div class="summary">
            <h2>Executive Summary</h2>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-number">{len(opens)}</div>
                    <div class="stat-label">Emails Opened</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #dc2626;">{len(clicks)}</div>
                    <div class="stat-label">Link Clicks (Failed)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number" style="color: #059669;">{len(set(e['tracking_id'] for e in clicks))}</div>
                    <div class="stat-label">High Risk Users</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>🚨 High Risk Users (Clicked Link)</h2>
            {'' if clicks else '<p>No users clicked the phishing link. Great job! 👏</p>'}
            {'' if not clicks else '''
            <table>
                <tr>
                    <th>Time</th>
                    <th>Tracking ID</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>ISP</th>
                </tr>
                ''' + ''.join([f"<tr class='high-risk'><td>{e['timestamp'][:19]}</td><td>{e['tracking_id']}</td><td>{e.get('ip_address', 'Unknown')}</td><td>{e.get('city', 'Unknown')}, {e.get('country', 'Unknown')}</td><td>{e.get('isp', 'Unknown')[:30]}</td></tr>" for e in clicks[:50]]) + '''
            </table>
            '''}
        </div>
        
        <div class="section">
            <h2>📧 Email Opens (Tracking Only)</h2>
            {'' if opens else '<p>No emails have been opened yet.</p>'}
            {'' if not opens else f'''
            <p>Total opens: {len(opens)} | Unique openers: {len(set(e['tracking_id'] for e in opens))}</p>
            '''}
        </div>
        
        <div class="recommendations">
            <h2>🎯 Recommendations</h2>
            <ul>
                <li><strong>High Risk Users:</strong> {len(set(e['tracking_id'] for e in clicks))} users clicked the phishing link and should receive mandatory security awareness training.</li>
                <li><strong>Training Topics:</strong> Focus on recognizing suspicious senders, urgency tactics, and hover-before-clicking.</li>
                <li><strong>Retest:>/strong> Schedule a follow-up phishing test in 30 days to measure improvement.</li>
                <li><strong>Policy:</strong> Consider implementing additional MFA requirements for high-risk users.</li>
            </ul>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This report was generated by the Cyber Awareness Tracker system.</p>
            <p>For questions, contact your IT Security team.</p>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(report_html)

@app.route('/bulk-upload')
def bulk_upload_page():
    """CSV bulk upload page"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>📊 Bulk Upload - Cyber Tracker</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #0b0f1a; color: #e2e8f0; }
            .container { max-width: 900px; margin: 40px auto; padding: 20px; }
            h1 { color: #3b82f6; margin-bottom: 10px; }
            .subtitle { color: #64748b; margin-bottom: 30px; }
            .card { background: #1a1f2e; padding: 30px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; color: #94a3b8; font-weight: 500; }
            textarea { width: 100%; padding: 14px; border: 1px solid #334155; border-radius: 8px; background: #0f172a; color: #e2e8f0; font-size: 14px; min-height: 200px; font-family: monospace; }
            button { background: #3b82f6; color: white; padding: 14px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; }
            button:hover { background: #2563eb; }
            .success { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .code-block { background: #0f172a; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; border: 1px solid #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background: #1e293b; color: #3b82f6; padding: 12px; text-align: left; }
            td { padding: 10px 12px; border-bottom: 1px solid #334155; }
            tr:hover { background: #1e293b; }
            .btn-secondary { background: #10b981; margin-left: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Bulk Upload Recipients</h1>
            <p class="subtitle">Upload multiple recipients via CSV format</p>
            
            <div class="card">
                <h3 style="color: #3b82f6; margin-top: 0;">Paste CSV Data</h3>
                
                <div class="form-group">
                    <label>CSV Format: name,email (one per line)</label>
                    <textarea id="csvData" placeholder="John Smith,john@company.com
Jane Doe,jane@company.com
Bob Wilson,bob@company.com"></textarea>
                </div>
                
                <button onclick="processCSV()">🚀 Generate Tracking Links</button>
                <a href="/dashboard" class="btn-secondary" style="text-decoration: none; display: inline-block; padding: 14px 28px; border-radius: 8px;">← Back to Dashboard</a>
            </div>
            
            <div id="results" style="display: none;">
                <div class="card">
                    <div class="success" id="successMsg"></div>
                    
                    <h3 style="color: #3b82f6; margin-top: 20px;">Generated Links</h3>
                    
                    <button onclick="copyAll()" style="margin-bottom: 15px;">📋 Copy All to Clipboard</button>
                    <button onclick="downloadCSV()" style="margin-left: 10px;">💾 Download as CSV</button>
                    
                    <table id="resultsTable">
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Tracking ID</th>
                            <th>Pixel URL</th>
                            <th>Tracking Link</th>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        
        <script>
            let generatedData = [];
            
            async function processCSV() {
                const csvText = document.getElementById('csvData').value.trim();
                if (!csvText) {
                    alert('Please enter CSV data');
                    return;
                }
                
                const lines = csvText.split('\n');
                generatedData = [];
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const email = parts[1].trim();
                        
                        const response = await fetch('/api/generate-email', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({name, email})
                        });
                        
                        const data = await response.json();
                        generatedData.push({
                            name: data.name,
                            email: data.email,
                            employeeId: data.employeeId,
                            trackingId: data.trackingId,
                            pixelUrl: data.pixelUrl,
                            trackingUrl: data.trackingUrl
                        });
                    }
                }
                
                displayResults();
            }
            
            function displayResults() {
                const table = document.getElementById('resultsTable');
                
                // Clear existing rows except header
                while (table.rows.length > 1) {
                    table.deleteRow(1);
                }
                
                generatedData.forEach(row => {
                    const tr = table.insertRow();
                    tr.innerHTML = `
                        <td>${row.name}</td>
                        <td>${row.email}</td>
                        <td><code>${row.trackingId}</code></td>
                        <td><input type="text" value="${row.pixelUrl}" style="width: 200px;" readonly onclick="this.select()"></td>
                        <td><input type="text" value="${row.trackingUrl}" style="width: 300px;" readonly onclick="this.select()"></td>
                    `;
                });
                
                document.getElementById('successMsg').innerHTML = `
                    ✅ Generated ${generatedData.length} tracking links!
                    <br><small>Copy these into your email campaigns.</small>
                `;
                document.getElementById('results').style.display = 'block';
            }
            
            function copyAll() {
                let text = 'Name,Email,TrackingID,PixelURL,TrackingURL\n';
                generatedData.forEach(row => {
                    text += `${row.name},${row.email},${row.trackingId},${row.pixelUrl},${row.trackingUrl}\n`;
                });
                navigator.clipboard.writeText(text);
                alert('Copied all data to clipboard!');
            }
            
            function downloadCSV() {
                let csv = 'Name,Email,TrackingID,PixelURL,TrackingURL\n';
                generatedData.forEach(row => {
                    csv += `${row.name},${row.email},${row.trackingId},${row.pixelUrl},${row.trackingUrl}\n`;
                });
                
                const blob = new Blob([csv], {type: 'text/csv'});
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tracking-links-' + new Date().toISOString().slice(0,10) + '.csv';
                a.click();
            }
        </script>
    </body>
    </html>
    """
    return render_template_string(html)

# ==================== EMAIL SENDER WEB INTERFACE ====================

def load_recipients():
    """Load recipients from campaign CSV"""
    recipients = []
    try:
        if os.path.exists(CAMPAIGN_CSV):
            with open(CAMPAIGN_CSV, 'r') as f:
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
    
    # Use patrickcorr.me for testing
    BASE_URL = "https://www.patrickcorr.me"
    from urllib.parse import quote
    
    failed_page_url = f"{BASE_URL}/failed-test?id={tracking_id}&name={quote(name)}"
    tracking_url = f"{BASE_URL}/track?id={tracking_id}&url={quote(failed_page_url, safe='')}&dest=failed"
    pixel_url = f"{BASE_URL}/pixel?id={employee_id}"
    
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M UTC')
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Microsoft 365 Security Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f2f1; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    
                    <!-- Header with Microsoft Logo -->
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center; border-bottom: 1px solid #e1dfdd;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="width: 24px; height: 24px; background: #f25022; display: inline-block; margin-right: 2px;"></td>
                                    <td style="width: 24px; height: 24px; background: #7fba00; display: inline-block;"></td>
                                </tr>
                                <tr>
                                    <td style="width: 24px; height: 24px; background: #00a4ef; display: inline-block; margin-right: 2px;"></td>
                                    <td style="width: 24px; height: 24px; background: #ffb900; display: inline-block;"></td>
                                </tr>
                            </table>
                            <p style="margin: 15px 0 0; font-size: 18px; color: #323130; font-weight: 600;">Microsoft 365</p>
                        </td>
                    </tr>
                    
                    <!-- Alert Banner -->
                    <tr>
                        <td style="background: #fff4ce; padding: 20px 40px; border-left: 4px solid #ffc107;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td width="40" valign="top" style="padding-right: 15px;">
                                        <span style="font-size: 28px;">⚠️</span>
                                    </td>
                                    <td>
                                        <h1 style="margin: 0 0 8px; font-size: 20px; color: #8b6914; font-weight: 600;">Security Notice</h1>
                                        <p style="margin: 0; font-size: 14px; color: #b78103; line-height: 1.5;">Sign‑in activity requires verification</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 35px 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; color: #323130; line-height: 1.6;">Dear {name},</p>
                            
                            <p style="margin: 0 0 18px; font-size: 16px; color: #323130; line-height: 1.6;">
                                We have detected <strong>unusual sign‑in activity</strong> on your Microsoft 365 account. In line with our security policy, we require verification before access can continue.
                            </p>
                            <p style="margin: 0 0 25px; font-size: 16px; color: #323130; line-height: 1.6;">
                                Please review the activity below and confirm whether it was you.
                            </p>
                            
                            <!-- Activity Details Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f3f2f1; border-radius: 6px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <p style="margin: 0 0 12px; font-size: 14px; color: #605e5c;">
                                            <span style="display: inline-block; width: 70px; color: #323130; font-weight: 600;">📍 Location:</span> 
                                            United Kingdom (IP: 185.XXX.XXX.XXX)
                                        </p>
                                        <p style="margin: 0 0 12px; font-size: 14px; color: #605e5c;">
                                            <span style="display: inline-block; width: 70px; color: #323130; font-weight: 600;">🕐 Time:</span> 
                                            {current_time}
                                        </p>
                                        <p style="margin: 0; font-size: 14px; color: #605e5c;">
                                            <span style="display: inline-block; width: 70px; color: #323130; font-weight: 600;">💻 Device:</span> 
                                            Windows 10 - Chrome Browser
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0; font-size: 16px; color: #323130; line-height: 1.6;">
                                If we do not receive verification within <strong>24 hours</strong>, access to your account may be <strong style="color: #d83b01;">temporarily restricted</strong> in line with our security controls.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                                <tr>
                                    <td style="border-radius: 4px; background: #0078d4; text-align: center;">
                                        <a href="{tracking_url}" 
                                           style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 4px;">
                                            Review Sign‑in Activity
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0 0; font-size: 14px; color: #605e5c; line-height: 1.5; text-align: center;">
                                If you recognise this activity, you may disregard this notice.
                            </p>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #7a7a7a; line-height: 1.5; text-align: center;">
                                Reference: <strong>UK‑SEC‑{datetime.now().strftime('%d%m%y')}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Security Tips -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #e1dfdd; padding-top: 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 15px; font-size: 13px; color: #605e5c; font-weight: 600;">🔒 Keeping your account secure:</p>
                                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #605e5c; line-height: 1.8;">
                                            <li>Never share your password with anyone</li>
                                            <li>Use multi‑factor authentication</li>
                                            <li>Review sign‑in activity regularly</li>
                                        </ul>
                                        <p style="margin: 12px 0 0; font-size: 12px; color: #8a8a8a;">If you believe this message is in error, contact your IT Service Desk.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px 40px; background: #f3f2f1; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #605e5c;">
                                © 2026 Microsoft Corporation. All rights reserved.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #a19f9d;">
                                One Microsoft Way, Redmond, WA 98052
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Tracking Pixel -->
    <img src="{pixel_url}" width="1" height="1" alt="" style="display: none;" />
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
            
            document.getElementById('recipient').addEventListener('change', function(){{
                const isCustom = this.value === 'custom';
                document.getElementById('customEmailGroup').style.display = isCustom ? 'block' : 'none';
                document.getElementById('customNameGroup').style.display = isCustom ? 'block' : 'none';
            }});
            
            async function generateEmail(){{
                const select = document.getElementById('recipient');
                const option = select.options[select.selectedIndex];
                
                let email, name, trackingId, employeeId;
                
                if (select.value === 'custom'){{
                    email = document.getElementById('customEmail').value;
                    name = document.getElementById('customName').value || 'Test User';
                    trackingId = 'custom_' + Date.now();
                    employeeId = 'custom_' + Date.now();
                }} else if (select.value){{
                    email = select.value;
                    name = option.dataset.name;
                    trackingId = option.dataset.tracking;
                    employeeId = option.dataset.id;
                }} else {{
                    alert('Please select a recipient');
                    return;
                }}
                
                const response = await fetch('/api/generate-email', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{name, email, trackingId, employeeId}})
                }});
                
                const data = await response.json();
                currentHTML = data.html;
                
                document.getElementById('htmlCode').textContent = currentHTML;
                // Prevent logging opens when previewing (strip tracking pixel)
                const previewHtml = currentHTML.replace(/<img[^>]*\/pixel[^>]*>/gi, '<!-- pixel removed for preview -->');
                document.getElementById('previewFrame').srcdoc = previewHtml;
                document.getElementById('successMsg').innerHTML = `
                    ✅ Email generated for <strong>${{name}}</strong> (${{email}})<br/>
                    <small>Tracking ID: ${{trackingId}}</small>
                `;
                document.getElementById('result').style.display = 'block';
                
                document.getElementById('result').scrollIntoView({{behavior: 'smooth'}});
            }}
            
            function copyHTML(){{
                navigator.clipboard.writeText(currentHTML).then(() => {{
                    alert('✅ HTML copied to clipboard! Now paste into Gmail.');
                }});
            }}
        </script>
    </body>
    </html>
    """
    
    return render_template_string(html)

@app.route('/api/send-email', methods=['POST'])
def send_email_api():
    """API endpoint to send email via SMTP"""
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    data = request.get_json()
    
    try:
        # Extract data
        smtp_host = data.get('smtpHost', 'smtp.gmail.com')
        smtp_port = int(data.get('smtpPort', 587))
        smtp_user = data.get('smtpUser', '')
        smtp_pass = data.get('smtpPass', '')
        from_email = data.get('fromEmail', smtp_user)
        from_name = data.get('fromName', 'Microsoft 365 Security')
        to_email = data.get('toEmail', '')
        to_name = data.get('toName', '')
        subject = data.get('subject', '⚠️ Action Required: Verify Your Microsoft 365 Account')
        html_content = data.get('html', '')
        
        if not all([smtp_user, smtp_pass, to_email]):
            return jsonify({'success': False, 'error': 'Missing SMTP credentials or recipient'}), 400
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'{from_name} <{from_email}>'
        msg['To'] = f'{to_name} <{to_email}>' if to_name else to_email
        
        # Attach HTML
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send via SMTP
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())
        
        return jsonify({
            'success': True,
            'message': f'Email sent successfully to {to_name or to_email}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/failed-test')
def failed_test_page():
    """Landing page shown when someone clicks the phishing link"""
    tracking_id = request.args.get('id', 'unknown')
    name = request.args.get('name', 'Colleague')
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>⚠️ Security Awareness Test - Failed</title>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            .container {{
                max-width: 600px;
                margin: 40px;
                background: white;
                padding: 50px;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
            }}
            .icon {{
                font-size: 80px;
                margin-bottom: 20px;
            }}
            h1 {{
                color: #dc2626;
                margin-bottom: 20px;
                font-size: 32px;
            }}
            .message {{
                font-size: 18px;
                color: #374151;
                line-height: 1.6;
                margin-bottom: 30px;
            }}
            .highlight {{
                background: #fef3c7;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #f59e0b;
                margin: 25px 0;
                text-align: left;
            }}
            .highlight h3 {{
                margin-top: 0;
                color: #92400e;
            }}
            .highlight ul {{
                margin: 10px 0;
                padding-left: 20px;
            }}
            .highlight li {{
                margin: 8px 0;
                color: #78350f;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }}
            .tracking-id {{
                font-family: monospace;
                font-size: 12px;
                color: #9ca3af;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🎣</div>
            <h1>You've Been Phished!</h1>
            
            <div class="message">
                <p><strong>Hi {name},</strong></p>
                <p>You just clicked on a simulated phishing email. This was a security awareness test, and unfortunately, this attempt was successful.</p>
            </div>
            
            <div class="highlight">
                <h3>🛡️ What You Should Have Noticed:</h3>
                <ul>
                    <li><strong>Suspicious sender:</strong> Check the "From" email address carefully</li>
                    <li><strong>Urgency tactics:</strong> Phishing emails often create false urgency ("24 hours")</li>
                    <li><strong>Unexpected requests:</strong> Verify account requests you didn't initiate</li>
                    <li><strong>Hover before clicking:</strong> Check the actual URL before clicking links</li>
                </ul>
            </div>
            
            <div class="message">
                <p><strong>Don't worry!</strong> This was just a test. No real credentials were compromised.</p>
                <p>🍀 <strong>Better luck next time!</strong></p>
            </div>
            
            <div class="footer">
                <p>This is part of your organization's security awareness training program.</p>
                <p>Questions? Contact your IT Security team.</p>
            </div>
            
            <div class="tracking-id">Test ID: {tracking_id}</div>
        </div>
    </body>
    </html>
    """
    
    return render_template_string(html)

# ==================== SMTP CREDENTIALS STORAGE ====================

SMTP_CONFIG_FILE = "smtp_config.json"

def load_smtp_config():
    """Load saved SMTP configuration"""
    try:
        if os.path.exists(SMTP_CONFIG_FILE):
            with open(SMTP_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {
        'smtpHost': 'smtp.gmail.com',
        'smtpPort': '587',
        'smtpUser': '',
        'smtpPass': '',
        'fromEmail': ''
    }

def save_smtp_config(config):
    """Save SMTP configuration to file"""
    try:
        with open(SMTP_CONFIG_FILE, 'w') as f:
            json.dump(config, f)
        return True
    except Exception as e:
        print(f"Error saving SMTP config: {e}")
        return False

@app.route('/api/smtp-config', methods=['GET'])
def get_smtp_config():
    """Get saved SMTP configuration"""
    config = load_smtp_config()
    # Return the actual password so it works for sending
    return jsonify({
        'smtpHost': config.get('smtpHost', 'smtp.gmail.com'),
        'smtpPort': config.get('smtpPort', '587'),
        'smtpUser': config.get('smtpUser', ''),
        'smtpPass': config.get('smtpPass', ''),  # Return actual password
        'fromEmail': config.get('fromEmail', ''),
        'hasPassword': bool(config.get('smtpPass'))
    })

@app.route('/api/smtp-config', methods=['POST'])
def save_smtp_config_api():
    """Save SMTP configuration"""
    data = request.get_json()
    
    config = {
        'smtpHost': data.get('smtpHost', 'smtp.gmail.com'),
        'smtpPort': data.get('smtpPort', '587'),
        'smtpUser': data.get('smtpUser', ''),
        'smtpPass': data.get('smtpPass', ''),
        'fromEmail': data.get('fromEmail', '')
    }
    
    if save_smtp_config(config):
        return jsonify({'success': True, 'message': 'Credentials saved!'})
    else:
        return jsonify({'success': False, 'error': 'Failed to save credentials'}), 500

@app.route('/api/generate-email', methods=['POST'])
def generate_email_api():
    """API endpoint to generate email HTML"""
    data = request.get_json()
    
    # Generate unique IDs
    import uuid
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    name = data.get('name', 'Test User')
    email = data.get('email', '')
    
    # Create employee ID from name (lowercase, no spaces)
    base_id = name.lower().replace(' ', '_').replace('.', '_')[:20]
    employee_id = f"{base_id}_{timestamp[-6:]}"
    tracking_id = f"{employee_id}_{uuid.uuid4().hex[:8]}"
    
    html = create_phishing_email(
        name=name,
        email=email,
        tracking_id=tracking_id,
        employee_id=employee_id
    )
    
    # Use patrickcorr.me for testing
    BASE_URL = "https://www.patrickcorr.me"
    
    return jsonify({
        'html': html,
        'name': name,
        'email': email,
        'employeeId': employee_id,
        'trackingId': tracking_id,
        'pixelUrl': f"{BASE_URL}/pixel?id={employee_id}",
        'trackingUrl': f"{BASE_URL}/track?id={tracking_id}&url={BASE_URL}/failed-test?id={tracking_id}&dest=failed"
    })

@app.route('/quick-send')
def quick_send_page():
    """Quick web form to type name and generate tracking email instantly"""
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>⚡ Quick Email Tracker - Type Name & Send</title>
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #0b0f1a; color: #e2e8f0; }
            .container { max-width: 1000px; margin: 40px auto; padding: 20px; }
            h1 { color: #3b82f6; margin-bottom: 10px; }
            .subtitle { color: #64748b; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
            .card { background: #1a1f2e; padding: 30px; border-radius: 12px; border: 1px solid #334155; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; color: #94a3b8; font-weight: 500; }
            input { width: 100%; padding: 14px; border: 1px solid #334155; border-radius: 8px; background: #0f172a; color: #e2e8f0; font-size: 15px; box-sizing: border-box; }
            input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
            button { background: #3b82f6; color: white; padding: 16px 32px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; width: 100%; }
            button:hover { background: #2563eb; }
            button:disabled { background: #475569; cursor: not-allowed; }
            .code-block { background: #0f172a; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; border: 1px solid #334155; margin-top: 15px; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
            .copy-btn { background: #10b981; margin-top: 10px; padding: 12px 24px; font-size: 14px; width: auto; }
            .copy-btn:hover { background: #059669; }
            .success { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 20px; border-radius: 8px; margin-top: 15px; }
            .info-box { background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .info-box h3 { color: #3b82f6; margin-top: 0; }
            .tracking-url { background: #0f172a; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 10px 0; word-break: break-all; }
            .preview-frame { width: 100%; height: 350px; border: 1px solid #334155; border-radius: 8px; background: white; margin-top: 15px; }
            .steps { margin: 20px 0; padding-left: 20px; }
            .steps li { margin: 12px 0; color: #94a3b8; line-height: 1.6; }
            .badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-right: 8px; }
            .spinner { display: none; border: 3px solid #334155; border-top: 3px solid #3b82f6; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; margin-right: 10px; vertical-align: middle; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚡ Quick Email Tracker</h1>
            <p class="subtitle">Type a name → Generate tracking email → Send!</p>
            
            <div class="grid">
                <div class="left-col">
                    <div class="card">
                        <h3 style="color: #3b82f6; margin-top: 0;">👤 Step 1: Enter Recipient</h3>
                        
                        <div class="form-group">
                            <label>Recipient Name *</label>
                            <input type="text" id="recipientName" placeholder="e.g., Jack Smith" onkeyup="checkForm()">
                        </div>
                        
                        <div class="form-group">
                            <label>Recipient Email (optional)</label>
                            <input type="email" id="recipientEmail" placeholder="e.g., jack@company.com">
                        </div>
                        
                        <button id="generateBtn" onclick="generateEmail()" disabled>
                            <span class="spinner" id="spinner"></span>
                            ✨ Generate Tracking Email
                        </button>
                    </div>
                    
                    <div class="card" id="trackingInfo" style="display: none;">
                        <h3 style="color: #3b82f6; margin-top: 0;">🔗 Tracking Info</h3>
                        <div id="trackingDetails"></div>
                    </div>
                </div>
                
                <div class="right-col">
                    <div class="card" id="resultCard" style="display: none;">
                        <div class="success" id="successMsg"></div>
                        
                        <h3 style="color: #3b82f6; margin-top: 20px;">📋 Step 2: Copy HTML</h3>
                        <p style="color: #94a3b8; font-size: 14px;">Click below to copy, then paste into Gmail:</p>
                        <button class="copy-btn" onclick="copyHTML()">📋 Copy HTML to Clipboard</button>
                        
                        <div class="code-block" id="htmlCode"></div>
                        
                        <h3 style="color: #3b82f6; margin-top: 25px;">👁️ Step 3: Preview</h3>
                        <p style="color: #94a3b8; font-size: 14px;">This is what they'll see:</p>
                        <iframe class="preview-frame" id="previewFrame"></iframe>
                        
                        <div class="info-box" style="margin-top: 25px;">
                            <h3>📤 Step 4: Send Email</h3>
                            <ol class="steps">
                                <li>Open <strong>Gmail</strong> → Click <strong>Compose</strong></li>
                                <li>Click <strong>⋮ (3 dots)</strong> → <strong>Insert HTML</strong></li>
                                <li>Paste the HTML code above</li>
                                <li>Set Subject: <code style="background: #0f172a; padding: 4px 8px; border-radius: 4px;">⚠️ Action Required: Verify Your Microsoft 365 Account</code></li>
                                <li>Send!</li>
                                <li>Watch your <a href="/dashboard" target="_blank" style="color: #3b82f6;">Dashboard</a> for opens & clicks!</li>
                            </ol>
                        </div>
                        
                        <div class="card" id="smtpSection" style="display: none; background: #0f172a; margin-top: 25px;">
                            <h3 style="color: #10b981; margin-top: 0;">📧 OR Send Directly via SMTP</h3>
                            <p style="color: #94a3b8; font-size: 14px;">Enter your SMTP credentials to send directly from this page:</p>
                            
                            <div class="form-group">
                                <label>SMTP Server</label>
                                <input type="text" id="smtpHost" value="smtp.gmail.com" placeholder="smtp.gmail.com">
                            </div>
                            
                            <div class="form-group">
                                <label>SMTP Port</label>
                                <input type="text" id="smtpPort" value="587" placeholder="587">
                            </div>
                            
                            <div class="form-group">
                                <label>Your Email (SMTP Username)</label>
                                <input type="email" id="smtpUser" placeholder="you@gmail.com">
                            </div>
                            
                            <input type="hidden" id="smtpPass" value="">
                            
                            <div class="form-group">
                                <label>From Email</label>
                                <input type="email" id="fromEmail" placeholder="security@microsoft-365-verify.com">
                            </div>
                            
                            <button id="sendBtn" onclick="sendEmail()" style="background: #10b981;">
                                <span class="spinner" id="sendSpinner"></span>
                                📤 Send Email Now
                            </button>
                            
                            <button onclick="saveSmtpConfig()" style="background: #3b82f6; margin-top: 10px;">
                                💾 Save Credentials for Later
                            </button>
                            
                            <div id="sendStatus" style="margin-top: 15px;"></div>
                            <div id="saveStatus" style="margin-top: 10px;"></div>
                        </div>
                    </div>
                    
                    <div class="card" id="emptyState">
                        <div style="text-align: center; padding: 40px; color: #64748b;">
                            <div style="font-size: 48px; margin-bottom: 15px;">✉️</div>
                            <p>Enter a name on the left and click Generate to create a tracking email!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let currentHTML = '';
            let currentData = {};
            let savedSmtpPass = '';  // Store saved password here
            
            function checkForm() {
                const name = document.getElementById('recipientName').value.trim();
                document.getElementById('generateBtn').disabled = !name;
            }
            
            async function generateEmail() {
                const name = document.getElementById('recipientName').value.trim();
                const email = document.getElementById('recipientEmail').value.trim();
                
                if (!name) {
                    alert('Please enter a recipient name');
                    return;
                }
                
                // Show spinner
                document.getElementById('spinner').style.display = 'inline-block';
                document.getElementById('generateBtn').disabled = true;
                
                try {
                    const response = await fetch('/api/generate-email', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({name, email})
                    });
                    
                    const data = await response.json();
                    currentHTML = data.html;
                    currentData = data;
                    
                    // Update UI
                    document.getElementById('htmlCode').textContent = currentHTML;
                    // Prevent logging opens when previewing (strip tracking pixel)
                    const previewHtml = currentHTML.replace(/<img[^>]*\/pixel[^>]*>/gi, '<!-- pixel removed for preview -->');
                    document.getElementById('previewFrame').srcdoc = previewHtml;
                    document.getElementById('successMsg').innerHTML = `
                        ✅ <strong>${data.name}</strong> has been assigned a unique tracking ID!<br>
                        <small>When they open the email or click the link, you'll see "${data.name}" in your dashboard.</small>
                    `;
                    
                    // Show tracking info
                    document.getElementById('trackingDetails').innerHTML = `
                        <div style="margin-bottom: 15px;">
                            <span class="badge">ID</span>
                            <code style="background: #0f172a; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${data.employeeId}</code>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <span class="badge" style="background: #10b981;">PIXEL</span>
                            <div class="tracking-url">${data.pixelUrl}</div>
                            <small style="color: #64748b;">→ Tracks when email is opened</small>
                        </div>
                        <div>
                            <span class="badge" style="background: #f59e0b;">LINK</span>
                            <div class="tracking-url">${data.trackingUrl}</div>
                            <small style="color: #64748b;">→ Tracks when link is clicked</small>
                        </div>
                    `;
                    
                    // Show result, hide empty state
                    document.getElementById('resultCard').style.display = 'block';
                    document.getElementById('trackingInfo').style.display = 'block';
                    document.getElementById('emptyState').style.display = 'none';
                    document.getElementById('smtpSection').style.display = 'block';
                    
                } catch (error) {
                    alert('Error generating email: ' + error.message);
                } finally {
                    document.getElementById('spinner').style.display = 'none';
                    document.getElementById('generateBtn').disabled = false;
                }
            }
            
            function copyHTML() {
                navigator.clipboard.writeText(currentHTML).then(() => {
                    const btn = document.querySelector('.copy-btn');
                    btn.textContent = '✅ Copied!';
                    btn.style.background = '#059669';
                    setTimeout(() => {
                        btn.textContent = '📋 Copy HTML to Clipboard';
                        btn.style.background = '#10b981';
                    }, 2000);
                });
            }
            
            async function sendEmail() {
                const smtpUser = document.getElementById('smtpUser').value.trim();
                // Always use saved password if present
                let smtpPass = savedSmtpPass || document.getElementById('smtpPass').value.trim();
                const fromEmail = document.getElementById('fromEmail').value.trim();
                const smtpHost = document.getElementById('smtpHost').value.trim();
                const smtpPort = document.getElementById('smtpPort').value.trim();
                
                if (!smtpUser || !smtpPass || !fromEmail) {
                    alert('SMTP credentials not loaded yet. Click "Save Credentials" once, then try again.');
                    return;
                }
                
                const toEmail = document.getElementById('recipientEmail').value.trim();
                const toName = document.getElementById('recipientName').value.trim();
                
                if (!toEmail) {
                    alert('Please enter recipient email');
                    return;
                }
                
                document.getElementById('sendSpinner').style.display = 'inline-block';
                document.getElementById('sendBtn').disabled = true;
                
                try {
                    const response = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            smtpHost,
                            smtpPort,
                            smtpUser,
                            smtpPass,
                            fromEmail,
                            fromName: 'Microsoft 365 Security',
                            toEmail,
                            toName,
                            html: currentHTML
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        document.getElementById('sendStatus').innerHTML = `
                            <div class="success">
                                ✅ <strong>Email sent!</strong><br>
                                ${result.message}<br>
                                <small>Check your <a href="/dashboard" target="_blank" style="color: #3b82f6;">Dashboard</a> for tracking!</small>
                            </div>
                        `;
                    } else {
                        document.getElementById('sendStatus').innerHTML = `
                            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 15px; border-radius: 6px;">
                                ❌ <strong>Send failed:</strong><br>
                                ${result.error}
                            </div>
                        `;
                    }
                } catch (error) {
                    document.getElementById('sendStatus').innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 15px; border-radius: 6px;">
                            ❌ Error: ${error.message}
                        </div>
                    `;
                } finally {
                    document.getElementById('sendSpinner').style.display = 'none';
                    document.getElementById('sendBtn').disabled = false;
                }
            }
            
            // Load saved SMTP config on page load
            async function loadSavedConfig() {
                try {
                    const response = await fetch('/api/smtp-config');
                    const config = await response.json();
                    
                    if (config.smtpHost) document.getElementById('smtpHost').value = config.smtpHost;
                    if (config.smtpPort) document.getElementById('smtpPort').value = config.smtpPort;
                    if (config.smtpUser) document.getElementById('smtpUser').value = config.smtpUser;
                    if (config.fromEmail) document.getElementById('fromEmail').value = config.fromEmail;
                    
                    // Store saved password in memory (not visible in field)
                    if (config.smtpPass) {
                        savedSmtpPass = config.smtpPass;
                    }
                } catch (error) {
                    console.log('No saved config found');
                }
            }
            
            // Save SMTP config
            async function saveSmtpConfig() {
                const config = {
                    smtpHost: document.getElementById('smtpHost').value.trim(),
                    smtpPort: document.getElementById('smtpPort').value.trim(),
                    smtpUser: document.getElementById('smtpUser').value.trim(),
                    smtpPass: savedSmtpPass || document.getElementById('smtpPass').value.trim(),
                    fromEmail: document.getElementById('fromEmail').value.trim()
                };
                
                if (!config.smtpUser || !config.smtpPass) {
                    alert('SMTP password not loaded yet. Please refresh the page and try again.');
                    return;
                }
                
                try {
                    const response = await fetch('/api/smtp-config', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(config)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        document.getElementById('saveStatus').innerHTML = `
                            <div class="success" style="padding: 10px;">
                                ✅ Credentials saved! They'll be used automatically.
                            </div>
                        `;
                    } else {
                        document.getElementById('saveStatus').innerHTML = `
                            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 10px; border-radius: 6px;">
                                ❌ Failed to save: ${result.error}
                            </div>
                        `;
                    }
                } catch (error) {
                    document.getElementById('saveStatus').innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 10px; border-radius: 6px;">
                            ❌ Error: ${error.message}
                        </div>
                    `;
                }
            }
            
            // Load saved config when page loads
            loadSavedConfig();
        </script>
    </body>
    </html>
    """
    
    return render_template_string(html)

if __name__ == '__main__':
    os.makedirs(CAMPAIGNS_DIR, exist_ok=True)
    
    print("=" * 60)
    print("🔒 Cyber Awareness Analytics Dashboard v3")
    print("=" * 60)
    print(f"Dashboard:    http://localhost:5000/dashboard")
    print(f"Quick Send:   http://localhost:5000/quick-send")
    print(f"Track:        http://localhost:5000/track?id=XXX&url=YYY")
    print(f"Pixel:        http://localhost:5000/pixel?id=XXX")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False)
