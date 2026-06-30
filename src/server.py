"""PetAgent HTTP 面板服务器 — 浏览器模式"""

import json
import os
import subprocess
import sys
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse


def open_browser_panel(installer, pack_dir: Path):
    """启动 HTTP 服务器并用浏览器打开面板"""

    # 找一个空闲端口
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()

    class PanelHandler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            self.directory = str(pack_dir)
            super().__init__(*a, **kw)

        def do_GET(self):
            p_path = urlparse(self.path).path
            if p_path == "/api/modules":
                self._json(installer.manifest.get("modules", []))
            elif p_path == "/api/target":
                self._json({
                    "target": str(installer.target),
                    "valid": (installer.target / "pyproject.toml").exists()
                })
            elif p_path == "/api/scan":
                from scanner import scan_hermes_targets
                found = scan_hermes_targets()
                self._json({"found": found, "selected": found[0] if found else ""})
            elif p_path == "/api/check-installed":
                self._json(self._check_installed(installer.target))
            elif p_path in ("/", "/panel.html"):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                panel = pack_dir / "panel.html"
                if panel.exists():
                    self.wfile.write(panel.read_bytes())
            else:
                super().do_GET()

        def do_POST(self):
            p_path = urlparse(self.path).path
            if p_path == "/api/install":
                l = int(self.headers.get("Content-Length", 0))
                d = json.loads(self.rfile.read(l))
                r = installer.install(d.get("modules", []))
                self._json(r)
            elif p_path == "/api/browse":
                l = int(self.headers.get("Content-Length", 0))
                d = json.loads(self.rfile.read(l))
                new_target = Path(d.get("path", ""))
                if new_target.exists():
                    installer.target = new_target.resolve()
                    v = (installer.target / "pyproject.toml").exists()
                    self._json({"target": str(installer.target), "valid": v})
                else:
                    self._json({"target": str(installer.target), "valid": False, "error": "路径不存在"})
            elif p_path == "/api/uninstall":
                l = int(self.headers.get("Content-Length", 0))
                d = json.loads(self.rfile.read(l))
                uninstall_target = Path(d.get("target", "")).resolve() if d.get("target") else installer.target
                if not uninstall_target.exists():
                    self._json({"success": False, "log": [{"level": "error", "msg": f"路径不存在: {uninstall_target}"}]})
                    return
                try:
                    uninstall_script = pack_dir / "uninstall.py"
                    if uninstall_script.exists():
                        python = sys.executable
                        r = subprocess.run(
                            [python, str(uninstall_script), "--json", "--target", str(uninstall_target)],
                            capture_output=True, text=True, cwd=str(pack_dir),
                            timeout=300, env={**os.environ, "PYTHONIOENCODING": "utf-8"}
                        )
                        lines = r.stdout.split("\n") + r.stderr.split("\n")
                        log = []
                        for line in lines:
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                entry = json.loads(line)
                                log.append(entry)
                            except json.JSONDecodeError:
                                log.append({"level": "info", "msg": line})
                        self._json({"success": r.returncode == 0, "log": log})
                    else:
                        self._json({"success": False, "log": [{"level": "error", "msg": "uninstall.py 脚本不存在"}]})
                except Exception as e:
                    self._json({"success": False, "log": [{"level": "error", "msg": f"卸载失败: {e}"}]})
            elif p_path == "/api/shutdown":
                self._json({"ok": True})
                threading.Thread(target=lambda: (self.server.shutdown(), sys.exit(0)), daemon=True).start()
            else:
                self.send_response(404)
                self.end_headers()

        def _check_installed(self, target: Path):
            import yaml
            hooks_yaml = Path(self.directory) / "hooks.yaml"
            if not hooks_yaml.exists():
                return {"installed": False, "modules": {}, "reason": "hooks.yaml 不存在"}
            with open(hooks_yaml, "r", encoding="utf-8") as f:
                hooks_map = yaml.safe_load(f)
            modules_status = {}
            has_any = False
            for hook_name, target_rel in hooks_map.items():
                target_file = target / target_rel
                if target_file.exists():
                    try:
                        content = target_file.read_text(encoding="utf-8")
                        installed = "PetAgent:" in content
                        modules_status[hook_name] = installed
                        if installed:
                            has_any = True
                    except Exception:
                        modules_status[hook_name] = False
            app_dir = target / "apps" / "desktop" / "release" / "win-unpacked" / "resources" / "app"
            if not has_any and app_dir.exists():
                for hook_name, target_rel in hooks_map.items():
                    if target_rel.startswith("apps/desktop/"):
                        asar_rel = target_rel[len("apps/desktop/"):]
                    else:
                        asar_rel = target_rel
                    tf = app_dir / asar_rel
                    if tf.exists():
                        try:
                            if "PetAgent:" in tf.read_text(encoding="utf-8"):
                                modules_status[hook_name] = True
                                has_any = True
                        except Exception:
                            pass
            return {"installed": has_any, "modules": modules_status}

        def _json(self, d):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(d, ensure_ascii=False).encode())

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def log_message(self, *a):
            pass

    server = HTTPServer(("127.0.0.1", port), PanelHandler)
    url = f"http://127.0.0.1:{port}/panel.html"
    print(f"打开面板: {url}")
    webbrowser.open(url)
    server.serve_forever()