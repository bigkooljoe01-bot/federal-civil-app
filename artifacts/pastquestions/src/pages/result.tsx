import React from "react";
import { useParams, Link } from "wouter";
import { useGetExamSession } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trophy, AlertCircle, FileText, Printer, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Result() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId || "0");

  const { data: session, isLoading, isError } = useGetExamSession(id, {
    query: {
      enabled: !!id,
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !session || session.status !== 'submitted') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-lg">Result not found or exam not submitted.</p>
        <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
      </div>
    );
  }

  // Calculate result if not provided by endpoint directly
  // The API doesn't return the full ExamResult from GET /exam-sessions/:id
  // We'll compute it from questions for display, or assume we fetch useGetExamReview
  // Let's rely on the question data
  const totalQuestions = session.questions.length;
  const answeredQuestions = session.questions.filter(q => q.selectedLetter !== null);
  const correctCount = answeredQuestions.filter(q => q.selectedLetter === q.question?.correctLetter).length;
  const wrongCount = answeredQuestions.length - correctCount;
  const unansweredCount = totalQuestions - answeredQuestions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = percentage >= 50;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Result</h1>
          <p className="text-muted-foreground mt-1">
            {session.examTypeName} {session.subjectName} {session.year}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className={`col-span-1 md:col-span-3 shadow-md border-t-4 ${passed ? 'border-t-primary' : 'border-t-destructive'}`}>
          <CardContent className="p-8 md:p-12 flex flex-col items-center text-center">
            <div className={`p-4 rounded-full mb-6 ${passed ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              <Trophy className="h-12 w-12" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black mb-2">{percentage}%</h2>
            <p className="text-xl font-medium text-muted-foreground mb-8">
              {passed ? "Excellent work! Keep it up." : "Needs improvement. Keep practicing."}
            </p>

            <div className="w-full max-w-md space-y-2 mb-8">
              <div className="flex justify-between text-sm font-medium">
                <span>Score</span>
                <span>{correctCount} / {totalQuestions}</span>
              </div>
              <Progress value={percentage} className={`h-3 ${passed ? '[&>div]:bg-primary' : '[&>div]:bg-destructive'}`} />
            </div>

            <div className="flex flex-wrap justify-center gap-4 w-full">
              <Link href={`/review/${id}`}>
                <Button size="lg" className="h-14 px-8 text-base">
                  <Eye className="mr-2 h-5 w-5" /> Review Answers
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base" onClick={() => window.print()}>
                <Printer className="mr-2 h-5 w-5" /> Print Result
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Correct Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{correctCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wrong Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{wrongCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unanswered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{unansweredCount}</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
