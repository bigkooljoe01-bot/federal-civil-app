import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListSubjects, useStartExamSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Shield, BookMarked, Globe, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  "Public Service Rules": FileText,
  "Financial Regulations": Shield,
  "Civil Service Handbook": BookMarked,
  "Administrative Procedures": BookMarked,
  "Current Affairs": Globe,
};

const SUBJECT_DESC: Record<string, string> = {
  "Public Service Rules": "Rules governing employment in the Federal Civil Service",
  "Financial Regulations": "Financial management rules for the Federal Government",
  "Civil Service Handbook": "Comprehensive handbook of civil service rules",
  "Administrative Procedures": "Guide to administrative procedures in the public service",
  "Current Affairs": "General knowledge and current affairs questions",
};

// Federal Civil Service exam type ID = 5, year = 2025
const EXAM_TYPE_ID = 5;
const YEAR = 2025;

const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "120 min", value: 120 },
];

export default function Practice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: subjectsData, isLoading } = useListSubjects();
  const startSession = useStartExamSession();
  const [duration, setDuration] = useState(60);

  const handleStart = (subjectId: number) => {
    startSession.mutate(
      { data: { examTypeId: EXAM_TYPE_ID, subjectId, year: YEAR, durationMinutes: duration } },
      {
        onSuccess: (session) => setLocation(`/exam/${session.id}`),
        onError: (err: any) => {
          toast({
            title: "Could not start session",
            description: err?.error || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // API returns a flat array; filter to Federal Civil Service subjects only
  const allSubjects: Array<{ id: number; name: string }> = Array.isArray(subjectsData)
    ? subjectsData
    : (subjectsData as any)?.subjects ?? [];
  const subjects = allSubjects.filter(s =>
    Object.keys(SUBJECT_ICONS).some(k => s.name.includes(k.split(" ")[0]))
  );

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Choose a Subject</h1>
        <p className="text-muted-foreground mt-1">Select a subject to start your practice session.</p>
      </div>

      {/* Duration selector */}
      <div className="mb-8">
        <p className="text-sm font-medium text-foreground mb-2">Session duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDuration(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                duration === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          No subjects found. Please contact an administrator.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject) => {
            const Icon = SUBJECT_ICONS[subject.name] || FileText;
            const desc = SUBJECT_DESC[subject.name] || "Practice questions for this subject";
            const isPending = startSession.isPending;

            return (
              <Card
                key={subject.id}
                className="group cursor-pointer border-muted hover:border-primary/60 hover:shadow-md transition-all duration-200 relative overflow-hidden"
                onClick={() => !isPending && handleStart(subject.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  {startSession.isPending && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
