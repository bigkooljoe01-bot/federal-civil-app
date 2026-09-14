import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# Keep Render's port scanner happy on Web Services
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

def start_health_server():
    port = int(os.environ.get("PORT", 8000))
    server = HTTPServer(("0.0.0.0", port), HealthCheckHandler)
    server.serve_forever()

threading.Thread(target=start_health_server, daemon=True).start()

# --- Your existing code starts here ---
print("Hello from repl-nix-workspace!")

# Keep the script running continuously
import time
while True:
    time.sleep(3600)