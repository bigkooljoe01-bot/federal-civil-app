import React from "react";
import { Link } from "wouter";
import { useGetMyProgress, useListMyAttempts } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Clock, PlayCircle, ArrowRight, History } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: progress, isLoading: progressLoading } = useGetMyProgress();
  const { data: attemptsData, isLoading: attemptsLoading } = useListMyAttempts({
    query: { limit: 5 }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Study Hall</h1>
          <p className="text-muted-foreground mt-1">Review your progress and keep the momentum going.</p>
        </div>
        <Link href="/practice">
          <Button size="lg" className="shadow-sm">
            <PlayCircle className="mr-2 h-5 w-5" />
            New Practice Session
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
            <History className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress?.totalAttempts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed exams</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(progress?.averageScore || 0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all subjects</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questions Answered</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress?.totalQuestionsAnswered || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total volume</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">Best Score</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{progress?.bestScore ? `${progress.bestScore}%` : '-'}</div>
            <p className="text-xs text-primary/80 mt-1">Personal record</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Attempts</CardTitle>
                <CardDescription>Your latest practice sessions</CardDescription>
              </div>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-primary">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!attemptsData?.attempts?.length ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                  No attempts yet. Time to start practicing!
                </div>
              ) : (
                <div className="space-y-4">
                  {attemptsData.attempts.map((attempt) => (
                    <div key={attempt.sessionId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-semibold">{attempt.examTypeName} • {attempt.subjectName}</div>
                        <div className="text-sm text-muted-foreground">
                          {attempt.year} • {format(new Date(attempt.submittedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-bold text-lg ${attempt.passed ? 'text-primary' : 'text-destructive'}`}>
                            {attempt.score}/{attempt.totalQuestions}
                          </div>
                          <div className="text-xs text-muted-foreground">{attempt.percentage}%</div>
                        </div>
                        <Link href={`/result/${attempt.sessionId}`}>
                          <Button variant="outline" size="sm">Review</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Subject Mastery</CardTitle>
              <CardDescription>Performance by subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!progress?.subjectBreakdown?.length ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Complete exams to see your mastery.
                </div>
              ) : (
                progress.subjectBreakdown.map((subject) => (
                  <div key={subject.subjectId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{subject.subjectName}</span>
                      <span className="text-muted-foreground">{Math.round(subject.averageScore)}% avg</span>
                    </div>
                    <Progress value={subject.averageScore} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">{subject.attempts} attempts</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
