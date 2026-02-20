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
except Exception:
    win32com = None

try:
    from pdf2image import convert_from_path
    import pytesseract
except Exception:
    convert_from_path = None
    pytesseract = None


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
    except Exception:
        return default


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def ensure_dirs():
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    # Ensure config base exists
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)


def log_append(textbox, msg):
    textbox.configure(state="normal")
    textbox.insert("end", msg + "\n")
    textbox.see("end")
    textbox.configure(state="disabled")


def get_outlook_folder(namespace, path_str):
    # path_str like "Inbox\\Scannedpdfs"
    parts = path_str.split("\\")
    folder = namespace.GetDefaultFolder(6)  # 6 = Inbox
    for p in parts[1:]:
        folder = folder.Folders[p]
    return folder


def extract_text_from_pdf(pdf_path, ocr_lang="eng", ocr_dpi=300):
    if convert_from_path is None or pytesseract is None:
        raise RuntimeError("OCR dependencies not installed. Install pytesseract and pdf2image.")
    pages = convert_from_path(pdf_path, dpi=ocr_dpi)
    text_chunks = []
    for img in pages:
        text_chunks.append(pytesseract.image_to_string(img, lang=ocr_lang))
    return "\n".join(text_chunks)


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
        # Try to find a company line containing Ltd/ Limited / LLC / Inc
        m = re.search(r"([A-Z][A-Za-z0-9&\-., ]+\b(?:Ltd|Limited|LLC|Inc|PLC|Corp|GmbH))", text)
        if m:
            supplier = m.group(1).strip()

    # Invoice/Bill number
    invoice = None
    m = re.search(r"(?:Invoice|Bill)\s*(?:No\.?|Number)?\s*[:#]?\s*([A-Za-z0-9\-_/]+)", text, re.IGNORECASE)
    if m:
        invoice = m.group(1).strip()

    # Date
    date = None
    m = re.search(r"(?:Invoice|Bill)\s*Date\s*[:]?\s*([0-9]{1,2}\s[A-Za-z]{3}\s[0-9]{4})", text, re.IGNORECASE)
    if not m:
        m = re.search(r"([0-9]{2}/[0-9]{2}/[0-9]{4})", text)
    if m:
        date = m.group(1).strip()

    return supplier, invoice, date


def process_outlook(config, aliases, log_fn):
    if win32com is None:
        log_fn("ERROR: pywin32 not available. Install requirements on Windows.")
        return

    outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
    scan_folder = get_outlook_folder(outlook, config["outlook_scan_folder"])  # Inbox\\Scannedpdfs
    processed_folder = get_outlook_folder(outlook, config["outlook_processed_folder"])  # Inbox\\processedscans

    temp_dir = config["temp_folder"]
    os.makedirs(temp_dir, exist_ok=True)
    dest_root = config["dest_root"]
    os.makedirs(dest_root, exist_ok=True)

    items = list(scan_folder.Items)
    if not items:
        log_fn("No emails in scan folder.")
        return

    for item in items:
        try:
            attachments = item.Attachments
            saved_paths = []

            for i in range(1, attachments.Count + 1):
                att = attachments.Item(i)
                filename = att.FileName
                if not filename.lower().endswith(".pdf"):
                    continue
                save_path = os.path.join(temp_dir, filename)
                att.SaveAsFile(save_path)
                saved_paths.append(save_path)

            if not saved_paths:
                continue

            # OCR all PDFs in the email
            full_text = ""
            for pdf in saved_paths:
                log_fn(f"OCR: {os.path.basename(pdf)}")
                full_text += extract_text_from_pdf(pdf, ocr_lang=config["ocr_language"], ocr_dpi=config["ocr_dpi"]) + "\n"

            supplier, invoice, date = parse_fields(full_text, aliases)

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

            for pdf in saved_paths:
                dest_name = os.path.basename(pdf)
                # Optionally include invoice/date in filename
                if config["rename_files"]:
                    stem, ext = os.path.splitext(dest_name)
                    date_part = date.replace("/", "-") if date else ""
                    inv_part = invoice if invoice else ""
                    dest_name = f"{stem}__{inv_part}__{date_part}{ext}".replace("  ", " ").strip("_")
                shutil.move(pdf, os.path.join(dest_dir, dest_name))

            # Move email to processed
            item.Move(processed_folder)
            log_fn(f"Processed: supplier={supplier_folder}, invoice={invoice}, date={date}")

        except Exception as e:
            log_fn(f"ERROR processing email: {e}")


def run_sync(textbox):
    config = load_json(CONFIG_PATH, {})
    aliases = load_json(ALIASES_PATH, {})

    def log_fn(msg):
        log_append(textbox, f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

    ensure_dirs()

    try:
        process_outlook(config, aliases, log_fn)
        log_fn("Done.")
    except Exception as e:
        log_fn(f"ERROR: {e}")


def start_sync_thread(textbox):
    t = threading.Thread(target=run_sync, args=(textbox,), daemon=True)
    t.start()


def main():
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")

    root = ctk.CTk()
    root.title(APP_NAME)
    root.geometry("720x480")

    header = ctk.CTkLabel(root, text=APP_NAME, font=ctk.CTkFont(size=24, weight="bold"))
    header.pack(pady=(20, 10))

    desc = ctk.CTkLabel(root, text="One‑click OCR sync for Outlook scanned PDFs", font=ctk.CTkFont(size=14))
    desc.pack(pady=(0, 10))

    button = ctk.CTkButton(root, text="Run / Sync", width=200, height=40, command=lambda: start_sync_thread(logbox))
    button.pack(pady=10)

    logbox = ctk.CTkTextbox(root, width=660, height=300)
    logbox.pack(pady=10)
    logbox.configure(state="disabled")

    root.mainloop()


if __name__ == "__main__":
    main()
