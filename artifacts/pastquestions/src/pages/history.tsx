import React from "react";
import { Link } from "wouter";
import { useListMyAttempts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, ArrowRight, BookOpen } from "lucide-react";

export default function History() {
  const { data, isLoading } = useListMyAttempts({
    query: { limit: 50 }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Practice History</h1>
        <p className="text-muted-foreground mt-1">Review your past performances to track your growth.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>All Attempts</CardTitle>
          <CardDescription>Your complete practice record</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !data?.attempts?.length ? (
            <div className="text-center py-16 px-4 bg-muted/20 rounded-lg border border-dashed flex flex-col items-center">
              <div className="bg-muted p-3 rounded-full mb-4">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No history yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                You haven't completed any practice exams yet. Start your first session to begin tracking your progress.
              </p>
              <Link href="/practice">
                <Button>Start Practicing</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0 divide-y">
              {data.attempts.map((attempt) => (
                <div key={attempt.sessionId} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4 hover:bg-muted/20 px-2 rounded transition-colors -mx-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{attempt.examTypeName} • {attempt.subjectName}</span>
                    <span className="text-sm text-muted-foreground">
                      {attempt.year} | {format(new Date(attempt.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <div className={`font-black text-xl ${attempt.passed ? 'text-primary' : 'text-destructive'}`}>
                        {attempt.percentage}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {attempt.score} / {attempt.totalQuestions}
                      </div>
                    </div>
                    <Link href={`/result/${attempt.sessionId}`}>
                      <Button variant="secondary" size="sm">
                        Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
