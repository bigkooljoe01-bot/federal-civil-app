import React from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProgress } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, ChevronRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  
  const { data: progress } = useGetMyProgress({
    query: {
      enabled: isAuthenticated,
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-20 border-b flex items-center justify-between px-6 md:px-12 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-2xl text-primary tracking-tight">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <BookOpen className="h-6 w-6" />
          </div>
          ExamPrep
        </div>
        <div>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button>Dashboard <ChevronRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          ) : (
            <Button onClick={() => login()} variant="default">Sign In</Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto w-full py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <GraduationCap className="h-4 w-4" />
          <span>Ace Your Exams with Confidence</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6">
          Master WAEC, NECO & JAMB. <span className="text-primary block mt-2">Anytime, Anywhere.</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          The ultimate study companion for Nigerian students. Practice past questions under timed conditions, track your progress, and walk into the exam hall ready to succeed.
        </p>

        {isAuthenticated && progress ? (
          <div className="bg-card border rounded-xl p-8 mb-8 w-full max-w-md shadow-sm text-left">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Welcome back!
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-3xl font-bold text-foreground">{progress.totalAttempts}</div>
                <div className="text-sm text-muted-foreground">Practice Sessions</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-primary">{Math.round(progress.averageScore || 0)}%</div>
                <div className="text-sm text-primary">Avg. Score</div>
              </div>
            </div>
            <Link href="/practice" className="block w-full">
              <Button size="lg" className="w-full text-lg h-12">Resume Practice</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={() => login()} className="text-lg h-14 px-8 shadow-md">
              Start Practicing Now
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
