import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListQuestions, 
  useDeleteQuestion, 
  usePublishQuestion,
  useListExamTypes,
  useListSubjects,
  getListQuestionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Edit2, Trash2, Search, FilterX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export default function AdminQuestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [examTypeId, setExamTypeId] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: examTypesData } = useListExamTypes();
  const { data: subjectsData } = useListSubjects();

  const queryParams: any = { limit: 100 };
  if (examTypeId !== "all") queryParams.examTypeId = parseInt(examTypeId);
  if (subjectId !== "all") queryParams.subjectId = parseInt(subjectId);

  const { data: questionsData, isLoading } = useListQuestions({ query: queryParams });
  
  const deleteMutation = useDeleteQuestion();
  const publishMutation = usePublishQuestion();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Question deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete question", variant: "destructive" });
          setDeleteId(null);
        }
      }
    );
  };

  const togglePublish = (id: number, currentStatus: boolean) => {
    publishMutation.mutate(
      { id, data: { published: !currentStatus } },
      {
        onSuccess: () => {
          toast({ title: `Question ${!currentStatus ? 'published' : 'unpublished'}` });
          queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        }
      }
    );
  };

  const clearFilters = () => {
    setExamTypeId("all");
    setSubjectId("all");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Manage all past questions in the system.</p>
        </div>
        <Link href="/admin/questions/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-[200px]">
              <Select value={examTypeId} onValueChange={setExamTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Exam Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exam Types</SelectItem>
                  {examTypesData?.examTypes.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectsData?.subjects.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(examTypeId !== "all" || subjectId !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <FilterX className="mr-2 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !questionsData?.questions.length ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
              No questions found matching these filters.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Exam/Subject</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionsData.questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {q.text}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{q.examTypeName}</div>
                        <div className="text-xs text-muted-foreground">{q.subjectName}</div>
                      </TableCell>
                      <TableCell>{q.year}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={q.published} 
                          onCheckedChange={() => togglePublish(q.id, q.published)}
                          disabled={publishMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/questions/${q.id}/edit`}>
                            <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
