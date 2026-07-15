import React from "react";
import { useParams, Link } from "wouter";
import { useGetExamReview } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

export default function Review() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId || "0");

  const { data: review, isLoading, isError } = useGetExamReview(id, {
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

  if (isError || !review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="font-medium text-lg">Review not available.</p>
        <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 sticky top-[64px] bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div className="flex items-center gap-4">
          <Link href={`/result/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Answer Review</h1>
            <p className="text-sm text-muted-foreground">
              {review.result.examTypeName} {review.result.subjectName}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1.5 text-primary">
            <CheckCircle2 className="h-4 w-4" /> {review.result.correct} Correct
          </div>
          <div className="flex items-center gap-1.5 text-destructive">
            <XCircle className="h-4 w-4" /> {review.result.wrong} Wrong
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {review.questions.map((q, idx) => {
          const isCorrect = q.isCorrect;
          const isUnanswered = q.selectedLetter === null;
          
          return (
            <Card key={q.questionId} id={`question-${idx}`} className={`shadow-sm border-l-4 overflow-hidden ${isCorrect ? 'border-l-primary' : isUnanswered ? 'border-l-muted' : 'border-l-destructive'}`}>
              <div className={`px-6 py-2 text-sm font-bold flex items-center justify-between ${isCorrect ? 'bg-primary/10 text-primary' : isUnanswered ? 'bg-muted/50 text-muted-foreground' : 'bg-destructive/10 text-destructive'}`}>
                <div className="flex items-center gap-2">
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : isUnanswered ? <AlertCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  Question {idx + 1}
                </div>
                <span>{isCorrect ? '+1 point' : '0 points'}</span>
              </div>
              <CardContent className="p-6 md:p-8">
                <div className="text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap text-foreground">
                  {q.questionText}
                </div>

                <div className="space-y-3 mb-8">
                  {q.options.map((opt) => {
                    const isSelected = q.selectedLetter === opt.letter;
                    const isActuallyCorrect = q.correctLetter === opt.letter;
                    
                    let bgClass = "bg-background border-muted";
                    let textClass = "text-foreground";
                    let icon = null;

                    if (isActuallyCorrect) {
                      bgClass = "bg-primary/10 border-primary shadow-sm";
                      textClass = "font-medium text-foreground";
                      icon = <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />;
                    } else if (isSelected && !isActuallyCorrect) {
                      bgClass = "bg-destructive/10 border-destructive";
                      textClass = "text-destructive font-medium";
                      icon = <XCircle className="h-5 w-5 text-destructive shrink-0" />;
                    }

                    return (
                      <div key={opt.id} className={`flex items-start space-x-3 p-4 border rounded-xl ${bgClass}`}>
                        <div className={`font-bold mt-0.5 ${isActuallyCorrect ? 'text-primary' : isSelected ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {opt.letter}.
                        </div>
                        <div className={`flex-1 text-base leading-relaxed ${textClass}`}>
                          {opt.text}
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="bg-muted/30 rounded-xl p-5 border border-muted">
                    <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                      <Info className="h-4 w-4" /> Explanation
                    </div>
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {q.explanation}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
