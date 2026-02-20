@echo off
cd /d %~dp0
python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed app.py --name "PaddysOCRTool"
echo Build complete: dist\PaddysOCRTool.exe
pause
