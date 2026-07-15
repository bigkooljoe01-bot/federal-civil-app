import React, { useState } from "react";
import { 
  useListExamTypes, 
  useCreateExamType, 
  useUpdateExamType, 
  useDeleteExamType,
  getListExamTypesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit2, Trash2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminExamTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListExamTypes();
  
  const createMutation = useCreateExamType();
  const updateMutation = useUpdateExamType();
  const deleteMutation = useDeleteExamType();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleOpen = (type?: any) => {
    if (type) {
      setEditingId(type.id);
      setName(type.name);
      setDescription(type.description || "");
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
            toast({ title: "Exam Type updated" });
            queryClient.invalidateQueries({ queryKey: getListExamTypesQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: { name, description } },
        {
          onSuccess: () => {
            toast({ title: "Exam Type created" });
            queryClient.invalidateQueries({ queryKey: getListExamTypesQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this exam type?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Exam type deleted" });
          queryClient.invalidateQueries({ queryKey: getListExamTypesQueryKey() });
        }
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Types</h1>
          <p className="text-muted-foreground mt-1">Manage exam categories (WAEC, JAMB, etc).</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" /> Add Exam Type</Button>
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
                {data?.examTypes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        {t.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(t)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.examTypes?.length && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No exam types found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Exam Type" : "New Exam Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. JAMB" />
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
