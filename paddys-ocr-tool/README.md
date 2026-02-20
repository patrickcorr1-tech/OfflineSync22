# Paddy's OCR Tool

Modern one‑click OCR sync for Outlook scanned PDFs.

## What it does
- Watches Outlook folder **Inbox\Scannedpdfs**
- OCRs PDF attachments
- Extracts **Supplier / Invoice # / Date**
- Moves PDFs to: `C:\Users\%USERNAME%\Documents\Scannedocuments\<Supplier>`
- Moves emails to **Inbox\processedscans**
- If **invoice number is missing**, it leaves the email in Scannedpdfs

## Requirements (Windows 11)
1) **Python 3.11 x64**
2) **Tesseract OCR** installed and on PATH
   - Download: https://github.com/UB-Mannheim/tesseract/wiki
3) **Poppler** for PDF conversion
   - Download: https://github.com/oschwartz10612/poppler-windows/releases/
   - Add `poppler\Library\bin` to PATH

## Install (dev)
```powershell
cd paddys-ocr-tool
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Build EXE (Windows)
```powershell
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed app.py --name "PaddysOCRTool"
```
The EXE will be in `dist\PaddysOCRTool.exe`.

## Configure
- `config.json` — Outlook folders, destination, OCR settings
- `aliases.json` — supplier alias matching
- `templates/` — optional supplier sample PDFs (for future template matching)

## Notes
- Uses default Outlook profile
- Only processes PDFs
- Leaves items in Scannedpdfs if invoice number not found
