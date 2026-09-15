import os
from http.server import HTTPServer, BaseHTTPRequestHandler

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Federal Civil Exam Practice Hub</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background-color: #f1f5f9; color: #0f172a; display: flex; justify-content: center; padding: 40px 20px; }
        .container { background: #ffffff; border-radius: 12px; max-width: 800px; width: 100%; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
        h1 { color: #1e3a8a; font-size: 1.8rem; margin-bottom: 8px; }
        p { color: #475569; font-size: 1rem; line-height: 1.5; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 24px; }
        .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; text-align: left; }
        .card h3 { color: #1e293b; margin-bottom: 8px; font-size: 1.1rem; }
        .btn { display: inline-block; margin-top: 12px; background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem; border: none; cursor: pointer; }
        .btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Federal Civil Exam Practice Hub</h1>
            <p>Welcome to the Civil Service Commission Examination Portal. Select a practice module to begin your past question review.</p>
        </header>
        <div class="grid">
            <div class="card">
                <h3>General Studies & Public Service Rules</h3>
                <p>Public service regulations, current affairs, and governance knowledge.</p>
                <button class="btn" onclick="alert('Module loading...')">Start Practice</button>
            </div>
            <div class="card">
                <h3>Verbal Reasoning & English</h3>
                <p>Comprehension, sentence structure, vocabulary, and verbal logic.</p>
                <button class="btn" onclick="alert('Module loading...')">Start Practice</button>
            </div>
            <div class="card">
                <h3>Quantitative & Data Interpretation</h3>
                <p>Numerical aptitude, problem-solving, and basic mathematics.</p>
                <button class="btn" onclick="alert('Module loading...')">Start Practice</button>
            </div>
        </div>
    </div>
</body>
</html>"""

class ExamAppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode("utf-8"))

def run():
    port = int(os.environ.get("PORT", 8000))
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, ExamAppHandler)
    print(f"Exam Hub live on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()