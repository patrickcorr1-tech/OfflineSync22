#!/usr/bin/env python3
"""Simple wrapper to start tracker and log everything"""
import sys
import os

# Change to script directory
os.chdir('/home/admin/.openclaw/workspace/cyber-tracker')

# Add venv to path (use the correct python version)
venv_path = '/home/admin/.openclaw/workspace/cyber-tracker/venv/lib/python3.14/site-packages'
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)
else:
    # Fallback for other python versions
    import glob
    site_packages = glob.glob('/home/admin/.openclaw/workspace/cyber-tracker/venv/lib/python*/site-packages')
    if site_packages:
        sys.path.insert(0, site_packages[0])

try:
    print("Starting tracker...", flush=True)
    from tracker import app
    print("App imported, starting server...", flush=True)
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
except Exception as e:
    print(f"Error: {e}", flush=True)
    import traceback
    traceback.print_exc()
