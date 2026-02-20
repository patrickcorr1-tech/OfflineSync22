#!/bin/bash
# Start tracker and keep it running

cd /home/admin/.openclaw/workspace/cyber-tracker

while true; do
    echo "Starting tracker at $(date)"
    ./venv/bin/python tracker.py
    echo "Tracker exited at $(date), restarting in 2 seconds..."
    sleep 2
done
