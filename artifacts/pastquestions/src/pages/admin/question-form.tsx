import React, { useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetQuestion, 
  useCreateQuestion, 
  useUpdateQuestion,
  useListExamTypes,
  useListSubjects
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const optionSchema = z.object({
  letter: z.string(),
  text: z.string().min(1, "Option text is required"),
});

const questionFormSchema = z.object({
  examTypeId: z.coerce.number().min(1, "Required"),
  subjectId: z.coerce.number().min(1, "Required"),
  year: z.coerce.number().min(1900, "Invalid year"),
  topic: z.string().optional(),
  text: z.string().min(5, "Question text is required"),
  explanation: z.string().optional(),
  correctLetter: z.string().min(1, "Required"),
  published: z.boolean().default(false),
  options: z.array(optionSchema).length(4, "Must have exactly 4 options"),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function QuestionForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";
  const questionId = isEdit ? parseInt(id) : 0;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: examTypesData } = useListExamTypes();
  const { data: subjectsData } = useListSubjects();
  
  const { data: question, isLoading: isQuestionLoading } = useGetQuestion(questionId, {
    query: { enabled: isEdit }
  });

  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      examTypeId: 0,
      subjectId: 0,
      year: new Date().getFullYear(),
      topic: "",
      text: "",
      explanation: "",
      correctLetter: "A",
      published: true,
      options: [
        { letter: "A", text: "" },
        { letter: "B", text: "" },
        { letter: "C", text: "" },
        { letter: "D", text: "" },
      ],
    },
  });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isEdit && question && !isInitialized.current) {
      form.reset({
        examTypeId: question.examTypeId,
        subjectId: question.subjectId,
        year: question.year,
        topic: question.topic || "",
        text: question.text,
        explanation: question.explanation || "",
        correctLetter: question.correctLetter,
        published: question.published,
        options: question.options.map(o => ({ letter: o.letter, text: o.text })),
      });
      isInitialized.current = true;
    }
  }, [question, isEdit, form]);

  const onSubmit = (values: QuestionFormValues) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: questionId, data: values },
        {
          onSuccess: () => {
            toast({ title: "Question updated successfully" });
            setLocation("/admin/questions");
          },
          onError: (e) => {
            toast({ title: "Error updating question", description: e.error, variant: "destructive" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast({ title: "Question created successfully" });
            setLocation("/admin/questions");
          },
          onError: (e) => {
            toast({ title: "Error creating question", description: e.error, variant: "destructive" });
          }
        }
      );
    }
  };

  if (isEdit && isQuestionLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin/questions">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Question" : "New Question"}</h1>
          <p className="text-muted-foreground text-sm">Fill in the details for this question.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="examTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Type</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {examTypesData?.examTypes.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="subjectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {subjectsData?.subjects.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="topic" render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Topic (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. Algebra, Mechanics..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20">
            <CardHeader><CardTitle>Question Content</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="text" render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl><Textarea className="min-h-[120px] text-base resize-y" placeholder="Type the full question here..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="space-y-4">
                <FormLabel>Options (A - D)</FormLabel>
                {['A', 'B', 'C', 'D'].map((letter, index) => (
                  <FormField key={letter} control={form.control} name={`options.${index}.text`} render={({ field }) => (
                    <FormItem className="flex items-start gap-4 space-y-0">
                      <div className="font-bold text-lg text-muted-foreground pt-2 w-6 text-center">{letter}.</div>
                      <div className="flex-1">
                        <FormControl><Input className="h-12" placeholder={`Option ${letter}`} {...field} /></FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <FormField control={form.control} name="correctLetter" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger className="border-primary text-primary font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Select which option is correct.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="published" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Published Status</FormLabel>
                      <FormDescription>Available to students immediately</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="explanation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (Optional)</FormLabel>
                  <FormControl><Textarea className="min-h-[100px]" placeholder="Explain why the correct answer is right..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/admin/questions"><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" size="lg" className="px-8 shadow-md" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Question"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
