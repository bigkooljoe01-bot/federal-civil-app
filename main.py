import os
import glob
from http.server import HTTPServer, SimpleHTTPRequestHandler

def find_index_file():
    # Search for index.html anywhere in the project
    matches = glob.glob("**/index.html", recursive=True)
    if matches:
        return matches[0]
    return None

class ExamAppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        target_file = find_index_file()

        if target_file and os.path.exists(target_file):
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open(target_file, "rb") as f:
                self.wfile.write(f.read())
        else:
            # Fallback inline UI if no HTML file is found
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"""
                <!DOCTYPE html>
                <html>
                <head><title>Federal Civil Exam Practice Hub</title></head>
                <body style="font-family:sans-serif; text-align:center; padding:50px;">
                    <h1 style="color:#1e3a8a;">Federal Civil Exam Practice Hub</h1>
                    <p>Practice Portal Active & Live on Render!</p>
                </body>
                </html>
            """)

def run():
    port = int(os.environ.get("PORT", 8000))
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, ExamAppHandler)
    print(f"Server running on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()