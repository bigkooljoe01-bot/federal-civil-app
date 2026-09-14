import os
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

class ExamAppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        # Replace or expand this HTML with your exam practice UI
        html_content = """
        <!DOCTYPE html>
        <html>
        <head><title>Federal Civil Exam Practice Hub</title></head>
        <body>
            <h1>Federal Civil Exam Practice Hub</h1>
            <p>Welcome! Select your practice test to begin.</p>
        </body>
        </html>
        """
        self.wfile.write(html_content.encode('utf-8'))

def start_server():
    port = int(os.environ.get("PORT", 8000))
    server = HTTPServer(("0.0.0.0", port), ExamAppHandler)
    server.serve_forever()

if __name__ == "__main__":
    start_server()