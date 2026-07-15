import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useListExamTypes, 
  useListSubjects, 
  useListAvailableYears, 
  useStartExamSession 
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, Target, Loader2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PracticeSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [examTypeId, setExamTypeId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [duration, setDuration] = useState<string>("60");

  const { data: examTypesData, isLoading: examTypesLoading } = useListExamTypes();
  const { data: subjectsData, isLoading: subjectsLoading } = useListSubjects();
  
  const { data: yearsData, isLoading: yearsLoading } = useListAvailableYears(
    { 
      examTypeId: examTypeId ? parseInt(examTypeId) : undefined,
      subjectId: subjectId ? parseInt(subjectId) : undefined 
    },
    {
      query: {
        enabled: !!examTypeId && !!subjectId,
      }
    }
  );

  const startSession = useStartExamSession();

  const handleStart = () => {
    if (!examTypeId || !subjectId || !year) {
      toast({
        title: "Missing fields",
        description: "Please select exam type, subject, and year to continue.",
        variant: "destructive",
      });
      return;
    }

    startSession.mutate(
      {
        data: {
          examTypeId: parseInt(examTypeId),
          subjectId: parseInt(subjectId),
          year: parseInt(year),
          durationMinutes: parseInt(duration),
        }
      },
      {
        onSuccess: (session) => {
          setLocation(`/exam/${session.id}`);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error?.error || "Failed to start practice session. Try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const isFormComplete = !!examTypeId && !!subjectId && !!year;

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Practice Setup</h1>
        <p className="text-muted-foreground mt-1">Configure your practice session. Choose your subject and let's get to work.</p>
      </div>

      <Card className="shadow-sm border-muted">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle>Session Configuration</CardTitle>
          <CardDescription>Select the exact paper you want to practice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" />
                Exam Type
              </Label>
              <Select value={examTypeId} onValueChange={setExamTypeId}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Select Exam (e.g. JAMB)" />
                </SelectTrigger>
                <SelectContent>
                  {examTypesLoading ? (
                    <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : examTypesData?.examTypes?.map(type => (
                    <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Subject
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!examTypeId}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsLoading ? (
                    <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : subjectsData?.subjects?.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Year
              </Label>
              <Select value={year} onValueChange={setYear} disabled={!examTypeId || !subjectId || yearsLoading}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearsLoading ? (
                    <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : !yearsData?.years?.length ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No years available for this combination</div>
                  ) : (
                    yearsData.years.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Duration (minutes)
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Minutes (Quick)</SelectItem>
                  <SelectItem value="60">60 Minutes (Standard)</SelectItem>
                  <SelectItem value="90">90 Minutes (Extended)</SelectItem>
                  <SelectItem value="120">120 Minutes (Full Length)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-6">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg shadow-md transition-all active:scale-[0.98]" 
            disabled={!isFormComplete || startSession.isPending}
            onClick={handleStart}
          >
            {startSession.isPending ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing Exam...</>
            ) : (
              <><PlayCircle className="mr-2 h-6 w-6" /> Start Practice Session</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
