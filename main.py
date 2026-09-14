import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

class ExamAppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve index.html if it exists at the root, otherwise serve standard files
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        return super().do_GET()

def run():
    port = int(os.environ.get("PORT", 8000))
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, ExamAppHandler)
    print(f"Server running on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()