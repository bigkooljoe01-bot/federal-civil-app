import React, { useState } from "react";
import { 
  useListSubjects, 
  useCreateSubject, 
  useUpdateSubject, 
  useDeleteSubject,
  getListSubjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit2, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminSubjects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListSubjects();
  
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleOpen = (subject?: any) => {
    if (subject) {
      setEditingId(subject.id);
      setName(subject.name);
      setDescription(subject.description || "");
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: { name, description } },
        {
          onSuccess: () => {
            toast({ title: "Subject updated" });
            queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: { name, description } },
        {
          onSuccess: () => {
            toast({ title: "Subject created" });
            queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Subject deleted" });
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground mt-1">Manage academic subjects.</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Add Subject</Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        {s.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.subjects?.length && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No subjects found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Subject" : "New Subject"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
