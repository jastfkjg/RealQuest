"""Start local development services; stop only the process groups we create."""

import argparse
import errno
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
CHILDREN = []


def run(command, cwd, env=None):
    subprocess.run(command, cwd=cwd, env=env, check=True)


def stop_services():
    # Groups include reload workers. Never terminate unrelated port owners.
    for child in CHILDREN:
        try:
            os.killpg(child.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    deadline = time.monotonic() + 5
    for child in CHILDREN:
        try:
            child.wait(timeout=max(0.01, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            pass
    for child in CHILDREN:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()


def interrupted(_signum, _frame):
    raise KeyboardInterrupt


def check_port(port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError as error:
            if error.errno in (errno.EACCES, errno.EPERM):
                raise RuntimeError("当前运行环境禁止监听本地端口，请在 macOS 终端中运行此脚本。") from error
            raise RuntimeError(f"端口 {port} 已被占用，请先停止对应服务或设置其他端口。") from error


def ready(url, child):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError(f"服务启动失败：{url}，请查看上方日志。")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.25)
    raise RuntimeError(f"等待服务启动超时：{url}")


def main():
    parser = argparse.ArgumentParser(description="一键启动 RealQuest 本地前后端")
    parser.add_argument("--check", action="store_true", help="只检查环境和端口，不安装或启动")
    args = parser.parse_args()
    if sys.version_info < (3, 14):
        raise RuntimeError("请安装 Python 3.14 或更新版本。")
    if not shutil.which("node") or not shutil.which("npm"):
        raise RuntimeError("请先安装 Node.js 22+（包含 npm）。")
    version = subprocess.check_output(["node", "--version"], text=True).strip()
    if int(version.lstrip("v").split(".")[0]) < 22:
        raise RuntimeError(f"需要 Node.js 22+，当前版本为 {version}。")
    backend_port = int(os.environ.get("REALQUEST_BACKEND_PORT", "8027"))
    frontend_port = int(os.environ.get("REALQUEST_FRONTEND_PORT", "5175"))
    if backend_port == frontend_port or not all(1 <= p <= 65535 for p in (backend_port, frontend_port)):
        raise RuntimeError("前后端端口必须不同，且位于 1–65535。")
    for port in (backend_port, frontend_port):
        check_port(port)
    if args.check:
        print(f"环境检查通过：Python {sys.version.split()[0]}、Node {version}；端口可用。", flush=True)
        return

    python = BACKEND / ".venv" / "bin" / "python"
    if not python.exists():
        print("创建后端虚拟环境…", flush=True)
        run([sys.executable, "-m", "venv", str(BACKEND / ".venv")], BACKEND)
    requirements = BACKEND / "requirements.lock.txt"
    # Compare installed distributions to the lock file without a mutable stamp.
    dependency_check = (
        "import importlib.metadata as m, pathlib; "
        f"rows=pathlib.Path({str(requirements)!r}).read_text().splitlines(); "
        "assert all(m.version(name)==version for name,version in "
        "(row.split('==',1) for row in rows if row.strip() and not row.startswith('#')))"
    )
    if subprocess.run([str(python), "-c", dependency_check], capture_output=True).returncode:
        print("安装后端依赖…", flush=True)
        run([str(python), "-m", "pip", "install", "-r", str(requirements)], BACKEND)
    installed_lock = FRONTEND / "node_modules" / ".package-lock.json"
    if (not (FRONTEND / "node_modules" / ".bin" / "vite").exists()
            or not installed_lock.exists()
            or (FRONTEND / "package-lock.json").stat().st_mtime > installed_lock.stat().st_mtime):
        print("安装前端依赖…", flush=True)
        run(["npm", "ci"], FRONTEND)

    env = os.environ.copy()
    backend_url = f"http://127.0.0.1:{backend_port}"
    frontend_url = f"http://127.0.0.1:{frontend_port}"
    origins = [item for item in env.get("ALLOWED_ORIGINS", "").split(",") if item]
    env["ALLOWED_ORIGINS"] = ",".join(dict.fromkeys(origins + [frontend_url, f"http://localhost:{frontend_port}"]))
    env["REALQUEST_API_TARGET"] = backend_url
    print("更新本地数据库…", flush=True)
    run([str(python), "-m", "alembic", "upgrade", "head"], BACKEND, env)
    child = subprocess.Popen(
        [str(python), "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", str(backend_port)],
        cwd=BACKEND, env=env, start_new_session=True,
    )
    CHILDREN.append(child)
    ready(f"{backend_url}/api/health", child)
    child = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(frontend_port), "--strictPort"],
        cwd=FRONTEND, env=env, start_new_session=True,
    )
    CHILDREN.append(child)
    ready(frontend_url, child)
    print(f"\nRealQuest 已启动：{frontend_url}\n按 Ctrl+C 一起停止前后端。\n", flush=True)
    while all(child.poll() is None for child in CHILDREN):
        time.sleep(0.5)
    raise RuntimeError("一个服务已退出，正在停止其他服务。")


if __name__ == "__main__":
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGTERM, interrupted)
    try:
        main()
    except KeyboardInterrupt:
        print("\n正在停止 RealQuest…", flush=True)
    except (RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"\n启动失败：{error}", file=sys.stderr)
        sys.exit(1)
    finally:
        stop_services()
