#!/usr/bin/env python3
"""Simple HTTP server with no-cache headers to prevent stale browsers."""
import http.server
import os

PORT = 8080

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for all files
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.expanduser('~/Desktop/Deving/Safan_ColorPicker'))
    server = http.server.HTTPServer(('0.0.0.0', PORT), NoCacheHandler)
    print(f'No-cache server running on http://0.0.0.0:{PORT}/')
    server.serve_forever()
