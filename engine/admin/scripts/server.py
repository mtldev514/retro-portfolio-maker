"""
SPA-aware dev server for the retro portfolio.
Serves static files normally, but falls back to index.html
for any .html route that doesn't exist on disk (SPA routing).

Usage:  python3 server.py [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # Strip query string for file lookup
        path = self.path.split('?')[0].split('#')[0]

        # Build the filesystem path (relative to repo root)
        fs_path = os.path.join(ROOT, path.lstrip('/'))

        # If the file exists on disk, serve it normally
        if os.path.isfile(fs_path):
            return super().do_GET()

        # For .html routes (or bare /) that don't exist, serve index.html
        if path == '/' or path.endswith('.html'):
            self.path = '/index.html'
            return super().do_GET()

        # Everything else: default behaviour (will 404 if missing)
        return super().do_GET()


print(f'SPA dev server running on http://localhost:{PORT}')
http.server.HTTPServer(('', PORT), SPAHandler).serve_forever()
