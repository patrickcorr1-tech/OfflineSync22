# Build script for Windows (PowerShell)
cd "$PSScriptRoot"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed app.py --name "PaddysOCRTool"
Write-Host "Build complete: dist\PaddysOCRTool.exe"