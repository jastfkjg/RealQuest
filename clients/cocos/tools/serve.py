"""Local-only static Cocos build + API proxy. No player database mutation here."""
import argparse
import functools
import http.client
import http.server
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=5420)
parser.add_argument('--api-port', type=int, default=8120)
parser.add_argument('--build', default='build/web-desktop')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / args.build
if not (root / 'index.html').is_file():
    raise SystemExit('Build the real Cocos Web target before serving.')


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        self.proxy()

    def do_DELETE(self):
        self.proxy()

    def proxy(self):
        if not self.path.startswith('/api/'):
            self.send_error(404)
            return
        connection = http.client.HTTPConnection('127.0.0.1', args.api_port, timeout=20)
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else None
            headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'connection', 'content-length')}
            connection.request(self.command, self.path, body, headers)
            response = connection.getresponse()
            data = response.read()
            self.send_response(response.status)
            for k, v in response.getheaders():
                if k.lower() not in ('connection', 'transfer-encoding', 'content-length'):
                    self.send_header(k, v)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (OSError, http.client.HTTPException):
            self.send_error(502, 'Local API is unavailable')
        finally:
            connection.close()


server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(root)))
print(f'Cocos local preview: http://127.0.0.1:{args.port} (API {args.api_port})', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
