import http.server
import os

class RangeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()

        file_size = os.path.getsize(path)
        range_header = self.headers.get('Range')

        if range_header:
            try:
                range_spec = range_header.strip().split('=')[1]
                parts = range_spec.split('-')
                start = int(parts[0]) if parts[0] else 0
                end = int(parts[1]) if parts[1] else file_size - 1
                end = min(end, file_size - 1)
                length = end - start + 1

                self.send_response(206)
                ctype = self.guess_type(path)
                self.send_header('Content-Type', ctype)
                self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                self.send_header('Content-Length', str(length))
                self.send_header('Accept-Ranges', 'bytes')
                self.end_headers()

                f = open(path, 'rb')
                f.seek(start)
                return f
            except Exception:
                pass

        self.send_response(200)
        ctype = self.guess_type(path)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(file_size))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        return open(path, 'rb')

if __name__ == '__main__':
    port = 8000
    print(f"Servidor con soporte de video en http://localhost:{port}")
    server = http.server.HTTPServer(('', port), RangeHTTPRequestHandler)
    server.serve_forever()
