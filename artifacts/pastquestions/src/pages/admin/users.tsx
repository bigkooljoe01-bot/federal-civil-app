import React from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export default function AdminUsers() {
  const { data, isLoading } = useListUsers({ query: { limit: 100 } });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">Manage platform users and view their roles.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Replit ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.profileImageUrl || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {u.firstName?.[0] || u.username?.[0] || <UserIcon className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.username}</span>
                          {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {u.replitId}
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.users?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
