"""
Erez Law Firm System — Update Manager
Mirrors the GTO Solver update_manager.py workflow:
  1. Package source as zip
  2. Publish to GitHub releases + push version.json
"""
import json
import os
import shutil
import subprocess
import threading
import tkinter as tk
from tkinter import messagebox, scrolledtext, simpledialog
from pathlib import Path
import urllib.request
import urllib.parse
import zipfile

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
PROJECT_DIR  = SCRIPT_DIR.parent
VERSION_FILE = PROJECT_DIR / 'version.txt'
VERSION_JSON = PROJECT_DIR / 'version.json'

GITHUB_OWNER = 'pokerwarden'
GITHUB_REPO  = 'erez-management'

# Files/folders to EXCLUDE from the release zip
EXCLUDE = {
    'node_modules', '.git', 'dist', '.env',
    'update-manager', 'downloader', 'lawfirm.db',
    'uploads', '__pycache__',
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def read_version() -> str:
    try:
        return VERSION_FILE.read_text().strip()
    except FileNotFoundError:
        return '1.0.0'

def bump_version(v: str) -> str:
    parts = v.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    return '.'.join(parts)

def gh_upload_release_asset(token, owner, repo, release_id, file_path: Path, log=None):
    upload_url = f'https://uploads.github.com/repos/{owner}/{repo}/releases/{release_id}/assets'
    size = file_path.stat().st_size
    if log:
        log(f'Uploading {file_path.name} ({size // 1024 // 1024} MB)...\n')
    with open(file_path, 'rb') as f:
        data = f.read()
    req = urllib.request.Request(
        f'{upload_url}?name={urllib.parse.quote(file_path.name)}',
        data=data,
        headers={
            'Authorization': f'token {token}',
            'Content-Type': 'application/octet-stream',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def gh_create_release(token, owner, repo, tag, changelog, log=None) -> dict:
    if log:
        log(f'Creating GitHub release {tag}...\n')
    payload = json.dumps({
        'tag_name': tag, 'name': tag, 'body': changelog,
        'draft': False, 'prerelease': False,
    }).encode()
    req = urllib.request.Request(
        f'https://api.github.com/repos/{owner}/{repo}/releases',
        data=payload,
        headers={
            'Authorization': f'token {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'erez-update-manager',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def gh_update_file(token, owner, repo, path_in_repo, content, message, log=None):
    import base64
    api_url = f'https://api.github.com/repos/{owner}/{repo}/contents/{path_in_repo}'
    headers = {'Authorization': f'token {token}', 'User-Agent': 'erez-update-manager'}
    sha = None
    try:
        req = urllib.request.Request(api_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            sha = json.loads(resp.read())['sha']
    except Exception:
        pass
    payload = {'message': message, 'content': base64.b64encode(content.encode()).decode()}
    if sha:
        payload['sha'] = sha
    if log:
        log(f'Pushing {path_in_repo} to GitHub...\n')
    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode(),
        headers={**headers, 'Content-Type': 'application/json'},
        method='PUT',
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# ── GUI ───────────────────────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Erez Law Firm — Update Manager')
        self.resizable(False, False)
        self.configure(bg='#1e293b')

        self._token: str = ''
        self._version = read_version()
        self._busy = False

        tk.Label(self, text='⚖  Erez Law Firm — Update Manager',
                 font=('Segoe UI', 14, 'bold'), bg='#1e293b', fg='#f8fafc').pack(pady=(18, 4))
        self._ver_label = tk.Label(self, text=f'Current version: v{self._version}',
                                   font=('Segoe UI', 10), bg='#1e293b', fg='#94a3b8')
        self._ver_label.pack()

        btn_frame = tk.Frame(self, bg='#1e293b')
        btn_frame.pack(pady=16, padx=24)

        self._btn_build = self._button(btn_frame, '1. Package Release', self._on_build, '#2563eb')
        self._btn_build.grid(row=0, column=0, padx=6)

        self._btn_publish = self._button(btn_frame, '2. Publish →', self._on_publish, '#16a34a')
        self._btn_publish.grid(row=0, column=1, padx=6)

        self._log = scrolledtext.ScrolledText(self, width=72, height=22,
                                              bg='#0f172a', fg='#e2e8f0',
                                              font=('Consolas', 9), relief='flat', bd=0)
        self._log.pack(padx=12, pady=(0, 12))

        self._status = tk.Label(self, text='Ready.', anchor='w',
                                bg='#0f172a', fg='#64748b', font=('Segoe UI', 9))
        self._status.pack(fill='x', side='bottom')

    def _button(self, parent, text, cmd, color):
        return tk.Button(parent, text=text, command=cmd, width=22,
                         bg=color, fg='white', font=('Segoe UI', 10, 'bold'),
                         relief='flat', padx=10, pady=8, cursor='hand2',
                         activebackground=color, activeforeground='white')

    def log(self, text: str):
        self._log.insert('end', text)
        self._log.see('end')
        self.update_idletasks()

    def status(self, text: str):
        self._status.config(text=text)
        self.update_idletasks()

    def _get_token(self) -> str:
        if not self._token:
            tok = simpledialog.askstring('GitHub Token',
                'GitHub Personal Access Token\n(needs repo scope):', show='*', parent=self)
            if not tok:
                raise RuntimeError('GitHub token required.')
            self._token = tok.strip()
        return self._token

    def _set_busy(self, busy: bool):
        self._busy = busy
        state = 'disabled' if busy else 'normal'
        self._btn_build.config(state=state)
        self._btn_publish.config(state=state)

    # ── Package ───────────────────────────────────────────────────────────────
    def _on_build(self):
        if self._busy:
            return
        threading.Thread(target=self._do_build, daemon=True).start()

    def _do_build(self):
        self._set_busy(True)
        self.status('Packaging...')
        self._log.delete('1.0', 'end')
        try:
            new_version = simpledialog.askstring(
                'New Version',
                f'Current: v{self._version}\nNew version:',
                initialvalue=bump_version(self._version),
                parent=self,
            )
            if not new_version:
                return
            new_version = new_version.strip()

            out_dir = SCRIPT_DIR / 'dist'
            out_dir.mkdir(exist_ok=True)
            zippath = out_dir / f'erez-v{new_version}.zip'

            self.log(f'Packaging project into {zippath.name}...\n')

            with zipfile.ZipFile(zippath, 'w', zipfile.ZIP_DEFLATED) as z:
                for item in PROJECT_DIR.rglob('*'):
                    # Skip excluded dirs/files
                    parts = item.relative_to(PROJECT_DIR).parts
                    if any(p in EXCLUDE for p in parts):
                        continue
                    if item.is_file():
                        arcname = item.relative_to(PROJECT_DIR)
                        z.write(item, arcname)
                        self.log(f'  + {arcname}\n')

            # Update version.txt
            VERSION_FILE.write_text(new_version)
            self._version = new_version
            self._ver_label.config(text=f'Current version: v{new_version}')

            self.log(f'\nPackaged: {zippath}\n')
            self.status(f'Package done — v{new_version}')
            messagebox.showinfo('Package Complete',
                f'Release zip ready: {zippath}\n\nClick "2. Publish →" to release.')

        except Exception as e:
            self.log(f'\nERROR: {e}\n')
            self.status('Package failed.')
            messagebox.showerror('Failed', str(e))
        finally:
            self._set_busy(False)

    # ── Publish ───────────────────────────────────────────────────────────────
    def _on_publish(self):
        if self._busy:
            return
        threading.Thread(target=self._do_publish, daemon=True).start()

    def _do_publish(self):
        self._set_busy(True)
        self.status('Publishing...')
        self._log.delete('1.0', 'end')
        try:
            token   = self._get_token()
            version = self._version
            tag     = f'v{version}'

            dist_dir = SCRIPT_DIR / 'dist'
            zippath  = dist_dir / f'erez-v{version}.zip'
            if not zippath.exists():
                raise RuntimeError(f'Zip not found: {zippath}\nRun "Package Release" first.')

            changelog = simpledialog.askstring(
                'Changelog', 'Changelog for this release:',
                initialvalue='תיקוני באגים ושיפורי ביצועים', parent=self,
            ) or 'עדכון מערכת'

            release = gh_create_release(token, GITHUB_OWNER, GITHUB_REPO, tag, changelog, log=self.log)
            release_id = release['id']

            asset = gh_upload_release_asset(token, GITHUB_OWNER, GITHUB_REPO, release_id, zippath, log=self.log)
            download_url = asset['browser_download_url']

            from datetime import date
            version_data = {
                'version': version,
                'releaseDate': date.today().isoformat(),
                'downloadUrl': download_url,
                'changelog': changelog,
            }
            VERSION_JSON.write_text(json.dumps(version_data, ensure_ascii=False, indent=2))
            gh_update_file(
                token, GITHUB_OWNER, GITHUB_REPO,
                'version.json',
                json.dumps(version_data, ensure_ascii=False, indent=2),
                f'Release {tag}',
                log=self.log,
            )

            self.log(f'\nPublished v{version}!\nURL: {download_url}\n')
            self.status(f'Published v{version}')
            messagebox.showinfo('Published!',
                f'v{version} is live.\n\nClients will see update banner automatically.')

        except Exception as e:
            self.log(f'\nERROR: {e}\n')
            self.status('Publish failed.')
            messagebox.showerror('Failed', str(e))
        finally:
            self._set_busy(False)


if __name__ == '__main__':
    app = App()
    app.mainloop()
