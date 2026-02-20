import os
import re
import json
import shutil
import threading
import sys
from datetime import datetime
import customtkinter as ctk

# Optional imports (Windows-only)
try:
    import win32com.client  # pywin32
except Exception as e:
    win32com = None
    WIN32COM_ERROR = str(e)

try:
    from pdf2image import convert_from_path
    import pytesseract
except Exception as e:
    convert_from_path = None
    pytesseract = None
    OCR_ERROR = str(e)

APP_NAME = "Paddy's OCR Tool"

# Prefer user Documents folder for config when running as EXE
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
else:
    exe_dir = os.path.dirname(os.path.abspath(__file__))

user_docs = os.path.join(os.path.expanduser("~"), "Documents", "PaddysOCRTool")
BASE_DIR = exe_dir
CONFIG_BASE = user_docs if os.path.isdir(user_docs) else exe_dir
CONFIG_PATH = os.path.join(CONFIG_BASE, "config.json")
ALIASES_PATH = os.path.join(CONFIG_BASE, "aliases.json")
TEMPLATES_DIR = os.path.join(CONFIG_BASE, "templates")

def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"DEBUG: Error loading {path}: {e}")
        return default

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def ensure_dirs():
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

def log_append(textbox, msg):
    textbox.configure(state="normal")
    textbox.insert("end", msg + "\n")
    textbox.see("end")
    textbox.configure(state="disabled")

def get_outlook_folder(namespace, path_str, log_fn=None):
    """Get Outlook folder by path with debug logging"""
    if log_fn:
        log_fn(f"DEBUG: Looking for folder path: {path_str}")
    
    parts = path_str.split("\\")
    if log_fn:
        log_fn(f"DEBUG: Path parts: {parts}")
    
    folder = namespace.GetDefaultFolder(6)  # 6 = Inbox
    if log_fn:
        log_fn(f"DEBUG: Got default folder (Inbox): {folder.Name}")
        log_fn(f"DEBUG: Inbox subfolders: {[f.Name for f in folder.Folders]}")
    
    for p in parts[1:]:  # Skip "Inbox"
        if log_fn:
            log_fn(f"DEBUG: Looking for subfolder: '{p}'")
        try:
            folder = folder.Folders[p]
            if log_fn:
                log_fn(f"DEBUG: Found folder: {folder.Name}")
        except Exception as e:
            if log_fn:
                log_fn(f"DEBUG ERROR: Cannot find folder '{p}': {e}")
            raise
    
    return folder

def extract_text_from_pdf(pdf_path, ocr_lang="eng", ocr_dpi=300):
    if convert_from_path is None or pytesseract is None:
        raise RuntimeError(f"OCR dependencies not installed. pdf2image error: {OCR_ERROR if 'OCR_ERROR' in dir() else 'N/A'}")
    pages = convert_from_path(pdf_path, dpi=ocr_dpi)
    text_chunks = []
    for img in pages:
        text_chunks.append(pytesseract.image_to_string(img, lang=ocr_lang))
    return " ".join(text_chunks)

def parse_fields(text, aliases):
    text_lc = text.lower()
    
    # Supplier from aliases (partial match)
    supplier = None
    for key, val in aliases.items():
        if key.lower() in text_lc:
            supplier = val
            break
    
    # Fallback supplier heuristic
    if not supplier:
        m = re.search(r"([A-Z][A-Za-z0-9&\-., ]+\b(?:Ltd|Limited|LLC|Inc|PLC|Corp|GmbH))", text)
        if m:
            supplier = m.group(1).strip()
    
    # Invoice number - IMPROVED MULTI-PATTERN
    invoice = None
    
    # Pattern 1: "Invoice- MSP-12345" or "Invoice: MSP-12345"
    m = re.search(r"(?:Invoice|Inv)[:#\-]?\s*(MSP[-:]?[A-Za-z0-9\-_/]+)", text, re.IGNORECASE)
    if m:
        invoice = m.group(1).strip()
    
    # Pattern 2: "Invoice number: MSP-12345" or "Invoice Number MSP-12345"
    if not invoice:
        m = re.search(r"(?:Invoice|Inv)\s+(?:No\.?|Number|#)[:#]?\s*(MSP[-:]?[A-Za-z0-9\-_/]+)", text, re.IGNORECASE)
        if m:
            invoice = m.group(1).strip()
    
    # Pattern 3: Just "MSP-12345" anywhere (with word boundary)
    if not invoice:
        m = re.search(r"\b(MSP[-:]?[0-9]{3,})\b", text, re.IGNORECASE)
        if m:
            invoice = m.group(1).strip()
    
    # Pattern 4: Generic fallback - any number after Invoice/Inv
    if not invoice:
        m = re.search(r"(?:Invoice|Inv)[:#\-]?\s*([A-Za-z0-9\-_/]{3,})", text, re.IGNORECASE)
        if m:
            invoice = m.group(1).strip()
    
    # Clean up invoice number - remove trailing words
    if invoice:
        invoice = re.sub(r"\s+(?:Date|Total|Amount|Due|Page).*$", "", invoice, flags=re.IGNORECASE)
        # Remove trailing punctuation
        invoice = re.sub(r"[:;,]+$", "", invoice)
    
    # Date
    date = None
    m = re.search(r"(?:Invoice|Bill)\s*Date\s*[:]\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})", text, re.IGNORECASE)
    if not m:
        m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4})", text)
    if m:
        date = m.group(1).strip()
    
    return supplier, invoice, date

def process_outlook(config, aliases, log_fn):
    # Check win32com
    if win32com is None:
        log_fn(f"ERROR: pywin32 not available. Error: {WIN32COM_ERROR if 'WIN32COM_ERROR' in dir() else 'Unknown'}")
        return
    
    log_fn("DEBUG: Starting Outlook connection...")
    
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
        log_fn("DEBUG: Outlook.Application dispatched")
        
        namespace = outlook.GetNamespace("MAPI")
        log_fn("DEBUG: MAPI namespace obtained")
        
        # Log config values
        scan_folder_path = config.get("outlook_scan_folder", "NOT_SET")
        processed_folder_path = config.get("outlook_processed_folder", "NOT_SET")
        log_fn(f"DEBUG: Config scan folder: {scan_folder_path}")
        log_fn(f"DEBUG: Config processed folder: {processed_folder_path}")
        
        # Get scan folder
        try:
            scan_folder = get_outlook_folder(namespace, scan_folder_path, log_fn)
            log_fn(f"DEBUG: Scan folder found: {scan_folder.Name}")
        except Exception as e:
            log_fn(f"ERROR: Cannot find scan folder '{scan_folder_path}': {e}")
            log_fn("DEBUG: Available folders in Inbox:")
            inbox = namespace.GetDefaultFolder(6)
            for f in inbox.Folders:
                log_fn(f"  - {f.Name}")
            return
        
        # Get processed folder
        try:
            processed_folder = get_outlook_folder(namespace, processed_folder_path, log_fn)
            log_fn(f"DEBUG: Processed folder found: {processed_folder.Name}")
        except Exception as e:
            log_fn(f"ERROR: Cannot find processed folder '{processed_folder_path}': {e}")
            return
        
        # Setup directories
        temp_dir = config.get("temp_folder", os.path.join(exe_dir, "temp"))
        dest_root = config.get("dest_root", os.path.join(exe_dir, "scanned"))
        
        log_fn(f"DEBUG: Temp dir: {temp_dir}")
        log_fn(f"DEBUG: Dest root: {dest_root}")
        
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(dest_root, exist_ok=True)
        
        # Get items
        items = list(scan_folder.Items)
        log_fn(f"DEBUG: Found {len(items)} items in scan folder")
        
        if not items:
            log_fn("No emails in scan folder.")
            return
        
        for idx, item in enumerate(items, 1):
            try:
                log_fn(f"DEBUG: Processing item {idx}/{len(items)}...")
                attachments = item.Attachments
                log_fn(f"DEBUG: Item has {attachments.Count} attachments")
                
                saved_paths = []
                
                for i in range(1, attachments.Count + 1):
                    att = attachments.Item(i)
                    filename = att.FileName
                    log_fn(f"DEBUG: Attachment: {filename}")
                    
                    if not filename.lower().endswith(".pdf"):
                        log_fn(f"DEBUG: Skipping non-PDF: {filename}")
                        continue
                    
                    save_path = os.path.join(temp_dir, filename)
                    att.SaveAsFile(save_path)
                    saved_paths.append(save_path)
                    log_fn(f"DEBUG: Saved PDF to: {save_path}")
                
                if not saved_paths:
                    log_fn("DEBUG: No PDFs in this email, skipping")
                    continue
                
                # OCR all PDFs in the email
                full_text = ""
                for pdf in saved_paths:
                    log_fn(f"OCR: {os.path.basename(pdf)}")
                    full_text += extract_text_from_pdf(pdf, ocr_lang=config.get("ocr_language", "eng"), ocr_dpi=config.get("ocr_dpi", 300)) + " "
                
                log_fn(f"DEBUG: Extracted {len(full_text)} characters of text")
                
                supplier, invoice, date = parse_fields(full_text, aliases)
                log_fn(f"DEBUG: Parsed - supplier={supplier}, invoice={invoice}, date={date}")
                
                if not invoice:
                    log_fn("Invoice number not found. Leaving email in Scannedpdfs.")
                    # Cleanup temp files
                    for p in saved_paths:
                        if os.path.exists(p):
                            os.remove(p)
                    continue
                
                supplier_folder = supplier if supplier else "Unknown Supplier"
                dest_dir = os.path.join(dest_root, supplier_folder)
                os.makedirs(dest_dir, exist_ok=True)
                log_fn(f"DEBUG: Destination folder: {dest_dir}")
                
                for pdf in saved_paths:
                    dest_name = os.path.basename(pdf)
                    # Optionally include invoice/date in filename
                    if config.get("rename_files", True):
                        stem, ext = os.path.splitext(dest_name)
                        date_part = date.replace("/", "-") if date else ""
                        inv_part = invoice if invoice else ""
                        dest_name = f"{stem}__{inv_part}__{date_part}{ext}".replace("  ", " ").strip("_")
                    
                    final_path = os.path.join(dest_dir, dest_name)
                    shutil.move(pdf, final_path)
                    log_fn(f"DEBUG: Moved PDF to: {final_path}")
                
                # Move email to processed
                item.Move(processed_folder)
                log_fn(f"Processed: supplier={supplier_folder}, invoice={invoice}, date={date}")
                
            except Exception as e:
                log_fn(f"ERROR processing email {idx}: {e}")
                import traceback
                log_fn(f"DEBUG: {traceback.format_exc()}")
                
    except Exception as e:
        log_fn(f"ERROR in process_outlook: {e}")
        import traceback
        log_fn(f"DEBUG: {traceback.format_exc()}")

def run_sync(textbox):
    log_fn = lambda msg: log_append(textbox, f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    log_fn("DEBUG: Starting sync...")
    log_fn(f"DEBUG: CONFIG_PATH = {CONFIG_PATH}")
    log_fn(f"DEBUG: ALIASES_PATH = {ALIASES_PATH}")
    log_fn(f"DEBUG: BASE_DIR = {BASE_DIR}")
    
    config = load_json(CONFIG_PATH, {})
    aliases = load_json(ALIASES_PATH, {})
    
    log_fn(f"DEBUG: Config loaded: {config}")
    log_fn(f"DEBUG: Aliases loaded: {aliases}")
    
    ensure_dirs()
    
    try:
        process_outlook(config, aliases, log_fn)
        log_fn("Done.")
    except Exception as e:
        log_fn(f"ERROR: {e}")
        import traceback
        log_fn(f"DEBUG: {traceback.format_exc()}")

def start_sync_thread(textbox):
    t = threading.Thread(target=run_sync, args=(textbox,), daemon=True)
    t.start()

def main():
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")
    
    root = ctk.CTk()
    root.title(APP_NAME)
    root.geometry("900x600")  # Wider for debug output
    
    header = ctk.CTkLabel(root, text=APP_NAME, font=ctk.CTkFont(size=24, weight="bold"))
    header.pack(pady=(20, 10))
    
    desc = ctk.CTkLabel(root, text="One click OCR sync for Outlook scanned PDFs", font=ctk.CTkFont(size=14))
    desc.pack(pady=(0, 10))
    
    button = ctk.CTkButton(root, text="Run / Sync", width=200, height=40, command=lambda: start_sync_thread(logbox))
    button.pack(pady=10)
    
    logbox = ctk.CTkTextbox(root, width=840, height=400)  # Taller for debug
    logbox.pack(pady=10)
    logbox.configure(state="disabled")
    
    root.mainloop()

if __name__ == "__main__":
    main()
