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
        .btn { display: inline-block; margin-top: 12px; background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
        .btn:hover { background: #1d4ed8; }
        .quiz-section { display: none; margin-top: 24px; background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #cbd5e1; }
        .option-btn { display: block; width: 100%; text-align: left; padding: 12px; margin: 8px 0; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 0.95rem; }
        .option-btn:hover { background: #e2e8f0; }
        .result { margin-top: 16px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Federal Civil Exam Practice Hub</h1>
            <p>Welcome to the Civil Service Commission Examination Portal. Select a practice module to begin your past question review.</p>
        </header>

        <div id="module-grid" class="grid">
            <div class="card">
                <h3>General Studies & Rules</h3>
                <p>Public service regulations, current affairs, and governance knowledge.</p>
                <button class="btn" onclick="startModule('General Knowledge')">Start Practice</button>
            </div>
            <div class="card">
                <h3>Verbal Reasoning & English</h3>
                <p>Comprehension, sentence structure, vocabulary, and verbal logic.</p>
                <button class="btn" onclick="startModule('Verbal Reasoning')">Start Practice</button>
            </div>
            <div class="card">
                <h3>Quantitative Aptitude</h3>
                <p>Numerical aptitude, problem-solving, and basic mathematics.</p>
                <button class="btn" onclick="startModule('Quantitative')">Start Practice</button>
            </div>
        </div>

        <div id="quiz-box" class="quiz-section">
            <h2 id="quiz-title" style="color:#1e3a8a; margin-bottom: 12px;">Practice Question</h2>
            <p id="question-text" style="font-size:1.1rem; margin-bottom: 16px; font-weight: 500;"></p>
            <div id="options-container"></div>
            <div id="feedback" class="result"></div>
            <button class="btn" style="background:#64748b; margin-top: 20px;" onclick="resetPortal()">← Choose Another Module</button>
        </div>
    </div>

    <script>
        const questions = {
            'General Knowledge': {
                q: "What is the primary body responsible for conducting civil service promotions in Nigeria?",
                options: ["Federal Civil Service Commission", "National Assembly", "Federal Ministry of Labor", "Code of Conduct Bureau"],
                answer: 0
            },
            'Verbal Reasoning': {
                q: "Choose the word synonymous with 'PRUDENT':",
                options: ["Careless", "Wise/Cautious", "Hasty", "Dishonest"],
                answer: 1
            },
            'Quantitative': {
                q: "If a civil servant's monthly allowance increases by 15% from ₦80,000, what is the new allowance?",
                options: ["₦88,000", "₦90,000", "₦92,000", "₦95,000"],
                answer: 2
            }
        };

        function startModule(name) {
            document.getElementById('module-grid').style.display = 'none';
            document.getElementById('quiz-box').style.display = 'block';
            document.getElementById('quiz-title').innerText = name + " Module";

            const item = questions[name];
            document.getElementById('question-text').innerText = item.q;

            const container = document.getElementById('options-container');
            container.innerHTML = '';
            document.getElementById('feedback').innerText = '';

            item.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerText = (idx + 1) + ". " + opt;
                btn.onclick = () => checkAnswer(idx, item.answer);
                container.appendChild(btn);
            });
        }

        function checkAnswer(selected, correct) {
            const feedback = document.getElementById('feedback');
            if (selected === correct) {
                feedback.innerText = "Correct answer!";
                feedback.style.color = "#16a34a";
            } else {
                feedback.innerText = "Incorrect. Try again!";
                feedback.style.color = "#dc2626";
            }
        }

        function resetPortal() {
            document.getElementById('quiz-box').style.display = 'none';
            document.getElementById('module-grid').style.display = 'grid';
        }
    </script>
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