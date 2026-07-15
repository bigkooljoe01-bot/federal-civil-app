import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetExamSession, 
  useSaveAnswer, 
  useFlagQuestion, 
  useSubmitExamSession,
  getGetExamSessionQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Flag, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExamSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = parseInt(sessionId || "0");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: session, isLoading, isError } = useGetExamSession(id, {
    query: {
      enabled: !!id,
    }
  });

  const saveAnswer = useSaveAnswer();
  const flagQuestion = useFlagQuestion();
  const submitExam = useSubmitExamSession();

  // Timer logic
  useEffect(() => {
    if (!session || session.status === 'submitted') return;

    const end = new Date(session.startedAt).getTime() + session.durationMinutes * 60000;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleSubmit = useCallback(() => {
    if (!session || session.status === 'submitted') return;
    
    submitExam.mutate(
      { sessionId: id },
      {
        onSuccess: () => {
          toast({
            title: "Exam submitted",
            description: "Your answers have been saved and scored.",
          });
          setLocation(`/result/${id}`);
        },
        onError: () => {
          toast({
            title: "Error submitting",
            description: "Failed to submit exam. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  }, [session, id, submitExam, setLocation, toast]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] items-center justify-center space-y-4">
        <p className="text-destructive font-medium">Failed to load exam session.</p>
        <Button onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (session.status === 'submitted') {
    setLocation(`/result/${id}`);
    return null;
  }

  const questions = session.questions || [];
  const currentQuestion = questions[currentIndex];
  
  if (!currentQuestion || !currentQuestion.question) {
    return <div>Question data missing.</div>;
  }

  const answeredCount = questions.filter(q => q.selectedLetter !== null).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (letter: string) => {
    // Optimistic update
    queryClient.setQueryData(getGetExamSessionQueryKey(id), (old: any) => {
      if (!old) return old;
      const updatedQuestions = old.questions.map((q: any) => 
        q.id === currentQuestion.id ? { ...q, selectedLetter: letter } : q
      );
      return { ...old, questions: updatedQuestions };
    });

    saveAnswer.mutate({
      sessionId: id,
      data: {
        questionId: currentQuestion.questionId,
        selectedLetter: letter
      }
    });
  };

  const handleToggleFlag = () => {
    const newFlagged = !currentQuestion.flagged;
    
    // Optimistic update
    queryClient.setQueryData(getGetExamSessionQueryKey(id), (old: any) => {
      if (!old) return old;
      const updatedQuestions = old.questions.map((q: any) => 
        q.id === currentQuestion.id ? { ...q, flagged: newFlagged } : q
      );
      return { ...old, questions: updatedQuestions };
    });

    flagQuestion.mutate({
      sessionId: id,
      data: {
        questionId: currentQuestion.questionId,
        flagged: newFlagged
      }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-muted/20">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-background border-b shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg hidden md:block">
            {session.examTypeName} {session.subjectName} {session.year}
          </div>
          <div className="md:hidden font-bold">Question {currentIndex + 1}</div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-md ${timeLeft !== null && timeLeft < 300 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-muted text-foreground'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          <Button 
            variant="default" 
            onClick={() => setShowSubmitDialog(true)}
            disabled={submitExam.isPending}
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 md:p-10 max-w-4xl mx-auto w-full flex-1">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {currentQuestion.question.topic && (
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    Topic: {currentQuestion.question.topic}
                  </span>
                )}
              </div>
              
              <Button 
                variant={currentQuestion.flagged ? "secondary" : "outline"} 
                size="sm"
                onClick={handleToggleFlag}
                className={currentQuestion.flagged ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200" : ""}
              >
                <Flag className={`h-4 w-4 mr-2 ${currentQuestion.flagged ? "fill-current" : ""}`} />
                {currentQuestion.flagged ? "Flagged for review" : "Flag"}
              </Button>
            </div>

            <Card className="shadow-sm border-muted mb-8">
              <CardContent className="p-6 md:p-8">
                <div className="text-lg md:text-xl font-medium leading-relaxed mb-8 whitespace-pre-wrap text-foreground">
                  {currentQuestion.question.text}
                </div>

                <RadioGroup 
                  value={currentQuestion.selectedLetter || ""} 
                  onValueChange={handleSelectAnswer}
                  className="space-y-3"
                >
                  {currentQuestion.question.options.map((opt) => (
                    <div 
                      key={opt.id} 
                      className={`
                        flex items-start space-x-3 p-4 border rounded-xl transition-all cursor-pointer hover:border-primary/50
                        ${currentQuestion.selectedLetter === opt.letter ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted bg-background'}
                      `}
                      onClick={() => handleSelectAnswer(opt.letter)}
                    >
                      <RadioGroupItem 
                        value={opt.letter} 
                        id={`opt-${opt.letter}`} 
                        className="mt-1"
                      />
                      <Label 
                        htmlFor={`opt-${opt.letter}`} 
                        className="flex-1 cursor-pointer text-base leading-relaxed font-normal"
                      >
                        <span className="font-bold mr-2 text-muted-foreground">{opt.letter}.</span>
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pb-8">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Previous
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
              >
                Next <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Palette */}
        <div className="w-80 bg-background border-l shadow-sm hidden lg:flex flex-col shrink-0">
          <div className="p-6 border-b">
            <h3 className="font-semibold mb-4">Exam Progress</h3>
            <Progress value={progressPercent} className="h-2 mb-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{answeredCount} Answered</span>
              <span>{questions.length - answeredCount} Unanswered</span>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <h3 className="font-semibold mb-4">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                let stateClass = "border-muted text-muted-foreground hover:border-primary/50";
                
                if (currentIndex === idx) {
                  stateClass = "border-primary bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background";
                } else if (q.flagged) {
                  stateClass = "border-yellow-400 bg-yellow-50 text-yellow-700";
                } else if (q.selectedLetter) {
                  stateClass = "border-primary/50 bg-primary/10 text-primary font-medium";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`
                      h-10 w-full rounded-md border text-sm flex items-center justify-center transition-all relative
                      ${stateClass}
                    `}
                  >
                    {idx + 1}
                    {q.flagged && currentIndex !== idx && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-background"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-primary bg-primary"></div>
                <span className="text-muted-foreground">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-primary/50 bg-primary/10"></div>
                <span className="text-muted-foreground">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-muted"></div>
                <span className="text-muted-foreground">Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-yellow-400 bg-yellow-50"></div>
                <span className="text-muted-foreground">Flagged</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {questions.length - answeredCount > 0 && " Are you sure you want to submit with unanswered questions?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Yes, Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
