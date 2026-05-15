"""
Erez Law Firm System — Main Installer (Stub)
=============================================
Permanent file — send to clients once, never rebuild.
Downloads the latest release zip from GitHub, extracts it,
installs Node.js dependencies, migrates the database, and starts the server.
"""
import json
import os
import platform
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import tkinter as tk
from tkinter import messagebox, ttk
import urllib.request
import zipfile
from pathlib import Path

VERSION_JSON_URL = 'https://raw.githubusercontent.com/pokerwarden/erez-management/main/version.json'
INSTALL_DIR = Path('C:/lawfirm-system')

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={'User-Agent': 'erez-installer'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

def download_file(url: str, dest: Path, progress_cb=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'erez-installer'})
    with urllib.request.urlopen(req) as resp:
        total = int(resp.headers.get('Content-Length', 0))
        downloaded = 0
        with open(dest, 'wb') as f:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if progress_cb and total:
                    progress_cb(downloaded / total)

def run(cmd: list, cwd: Path, log=None) -> str:
    if log:
        log(f'> {" ".join(str(c) for c in cmd)}')
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(cwd))
    if log and result.stdout:
        log(result.stdout.strip())
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or f'Command failed: {cmd}')
    return result.stdout.strip()

def node_ok() -> bool:
    try:
        subprocess.run(['node', '--version'], capture_output=True, timeout=5)
        return True
    except Exception:
        return False

# ── GUI ───────────────────────────────────────────────────────────────────────

class Installer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Erez — התקנת מערכת ניהול משרד')
        self.resizable(False, False)
        self.configure(bg='#1e293b')
        self.geometry('540x460')

        self._admin_name  = tk.StringVar()
        self._admin_email = tk.StringVar()
        self._admin_pass  = tk.StringVar()
        self._firm_name   = tk.StringVar(value='משרד עורכי דין')
        self._busy        = False

        self._build_ui()

    def _build_ui(self):
        tk.Label(self, text='⚖  Erez — התקנת מערכת ניהול משרד',
                 font=('Segoe UI', 13, 'bold'), bg='#1e293b', fg='#f8fafc').pack(pady=(18, 2))
        tk.Label(self, text='המערכת תורד ותותקן אוטומטית ב־ C:\\lawfirm-system',
                 font=('Segoe UI', 9), bg='#1e293b', fg='#94a3b8').pack(pady=(0, 14))

        form = tk.Frame(self, bg='#1e293b')
        form.pack(padx=32, fill='x')

        def row(label, var, r, show=None):
            tk.Label(form, text=label, bg='#1e293b', fg='#cbd5e1',
                     font=('Segoe UI', 9), anchor='w').grid(row=r, column=0, sticky='w', pady=4)
            kw = {'show': show} if show else {}
            tk.Entry(form, textvariable=var, width=32, bg='#0f172a', fg='#f1f5f9',
                     insertbackground='white', relief='flat', **kw).grid(row=r, column=1, sticky='ew', padx=(8, 0))

        row('שם המשרד:', self._firm_name, 0)
        row('שם מנהל המערכת:', self._admin_name, 1)
        row('אימייל מנהל:', self._admin_email, 2)
        row('סיסמת מנהל (8+ תווים):', self._admin_pass, 3, show='*')
        form.columnconfigure(1, weight=1)

        self._progress = ttk.Progressbar(self, length=476, mode='determinate')
        self._progress.pack(pady=(18, 4), padx=32)

        self._status = tk.Label(self, text='', bg='#1e293b', fg='#94a3b8', font=('Segoe UI', 9))
        self._status.pack()

        self._log_text = tk.Text(self, height=6, bg='#0f172a', fg='#94a3b8',
                                 font=('Consolas', 8), relief='flat', state='disabled')
        self._log_text.pack(padx=32, pady=(8, 0), fill='x')

        self._btn = tk.Button(self, text='התקן עכשיו', command=self._start,
                              bg='#2563eb', fg='white', font=('Segoe UI', 11, 'bold'),
                              relief='flat', padx=20, pady=10, cursor='hand2')
        self._btn.pack(pady=16)

    def log(self, msg: str):
        self._log_text.config(state='normal')
        self._log_text.insert('end', msg + '\n')
        self._log_text.see('end')
        self._log_text.config(state='disabled')
        self.update_idletasks()

    def status(self, msg: str, pct: float = None):
        self._status.config(text=msg)
        if pct is not None:
            self._progress['value'] = int(pct * 100)
        self.update_idletasks()

    def _start(self):
        if self._busy:
            return
        name  = self._admin_name.get().strip()
        email = self._admin_email.get().strip()
        pwd   = self._admin_pass.get().strip()
        firm  = self._firm_name.get().strip() or 'משרד עורכי דין'

        if not name or not email or len(pwd) < 8:
            messagebox.showerror('שגיאה', 'מלא שם, אימייל וסיסמה (לפחות 8 תווים)')
            return

        self._busy = True
        self._btn.config(state='disabled')
        threading.Thread(target=self._do_install,
                         args=(name, email, pwd, firm), daemon=True).start()

    def _do_install(self, admin_name, admin_email, admin_pass, firm_name):
        try:
            # 1 — Check Node.js
            self.status('בודק Node.js...', 0.02)
            if not node_ok():
                raise RuntimeError(
                    'Node.js אינו מותקן.\n'
                    'הורד מ: https://nodejs.org (LTS)\n'
                    'לאחר ההתקנה הפעל מחדש את המתקין.'
                )
            self.log('Node.js OK')

            # 2 — Fetch version.json
            self.status('מוריד פרטי גרסה...', 0.05)
            self.log('Fetching version.json...')
            info = fetch_json(VERSION_JSON_URL)
            version      = info['version']
            download_url = info['downloadUrl']
            self.log(f'Latest: v{version}')

            # 3 — Download release zip
            INSTALL_DIR.mkdir(parents=True, exist_ok=True)
            zippath = INSTALL_DIR / f'erez-v{version}.zip'
            self.status(f'מוריד גרסה v{version}...', 0.08)
            self.log(f'Downloading {download_url}')

            def prog(p):
                self.status(f'מוריד... {int(p*100)}%', 0.08 + p * 0.35)

            download_file(download_url, zippath, progress_cb=prog)
            self.log('Download complete.')

            # 4 — Extract
            self.status('מחלץ קבצים...', 0.44)
            self.log('Extracting...')
            with zipfile.ZipFile(zippath, 'r') as z:
                z.extractall(INSTALL_DIR)
            zippath.unlink()

            # 5 — Write .env
            self.status('יוצר קובץ הגדרות...', 0.50)
            jwt_secret = secrets.token_hex(32)
            env = (
                f'FIRM_NAME={firm_name}\n'
                f'PORT=4000\n'
                f'NODE_ENV=production\n'
                f'DATABASE_URL=file:./prisma/lawfirm.db\n'
                f'JWT_SECRET={jwt_secret}\n'
                f'UPLOAD_DIR=./uploads\n'
                f'MAX_FILE_SIZE_MB=20\n'
            )
            (INSTALL_DIR / 'server' / '.env').write_text(env, encoding='utf-8')
            self.log('.env created.')

            # 6 — npm install server
            self.status('מתקין חבילות שרת...', 0.55)
            self.log('npm install (server)...')
            run(['npm', 'install', '--omit=dev'], INSTALL_DIR / 'server', log=self.log)

            # 7 — Prisma generate + migrate
            self.status('מגדיר מסד נתונים...', 0.65)
            self.log('Prisma generate...')
            run(['npx', 'prisma', 'generate'], INSTALL_DIR / 'server', log=self.log)
            self.log('Prisma db push...')
            run(['npx', 'prisma', 'db', 'push', '--accept-data-loss'],
                INSTALL_DIR / 'server', log=self.log)

            # 8 — Build server
            self.status('בונה שרת...', 0.72)
            self.log('Building server...')
            run(['npm', 'run', 'build'], INSTALL_DIR / 'server', log=self.log)

            # 9 — npm install + build client
            self.status('בונה ממשק...', 0.80)
            self.log('npm install (client)...')
            run(['npm', 'install'], INSTALL_DIR / 'client', log=self.log)
            self.log('Building frontend...')
            run(['npm', 'run', 'build'], INSTALL_DIR / 'client', log=self.log)

            # 10 — Copy frontend build → server/public
            self.status('מעתיק ממשק...', 0.90)
            pub = INSTALL_DIR / 'server' / 'public'
            if pub.exists():
                shutil.rmtree(pub)
            shutil.copytree(INSTALL_DIR / 'client' / 'dist', pub)
            (INSTALL_DIR / 'server' / 'uploads').mkdir(exist_ok=True)

            # 11 — Create START.bat
            start_bat = (
                '@echo off\n'
                f'cd /d "{INSTALL_DIR}\\server"\n'
                'node dist/index.js\n'
            )
            (INSTALL_DIR / 'START.bat').write_text(start_bat)

            # 12 — Start server & init admin
            self.status('מפעיל שרת...', 0.94)
            self.log('Starting server...')
            subprocess.Popen(
                ['node', 'dist/index.js'],
                cwd=str(INSTALL_DIR / 'server'),
                creationflags=subprocess.CREATE_NEW_CONSOLE if platform.system() == 'Windows' else 0,
            )

            import time
            for _ in range(30):
                try:
                    urllib.request.urlopen('http://localhost:4000/api/health', timeout=2)
                    break
                except Exception:
                    time.sleep(2)
            else:
                raise RuntimeError('השרת לא הגיב. פתח START.bat ידנית.')

            # 13 — Create admin user
            self.status('יוצר משתמש מנהל...', 0.97)
            payload = json.dumps({
                'name': admin_name, 'email': admin_email, 'password': admin_pass
            }).encode()
            req = urllib.request.Request(
                'http://localhost:4000/api/setup/init',
                data=payload,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as r:
                    result = json.loads(r.read())
                    if not result.get('success'):
                        self.log(f'Warning: {result}')
            except Exception as e:
                self.log(f'Admin init: {e}')

            self.status('ההתקנה הושלמה!', 1.0)
            messagebox.showinfo(
                'ההתקנה הושלמה!',
                f'המערכת מותקנת בהצלחה — v{version}\n\n'
                f'כתובת: http://localhost:4000\n\n'
                f'להפעלה עתידית: לחץ פעמיים על\n'
                f'{INSTALL_DIR}\\START.bat'
            )

        except Exception as e:
            self.status('שגיאה', None)
            self.log(f'ERROR: {e}')
            messagebox.showerror('שגיאה בהתקנה', str(e))
        finally:
            self._busy = False
            self._btn.config(state='normal')


if __name__ == '__main__':
    app = Installer()
    app.mainloop()
