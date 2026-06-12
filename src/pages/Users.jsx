import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { UserPlus, Users as UsersIcon, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";

const roleColors = {
  admin: "bg-purple-100 text-purple-700",
  teacher: "bg-blue-100 text-blue-700",
  student: "bg-green-100 text-green-700",
  parent: "bg-amber-100 text-amber-700",
};

export default function Users() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "teacher" });

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date"),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("User removed");
    },
  });

  const invite = async (e) => {
    e.preventDefault();
    if (!form.email) return;
    await base44.users.inviteUser(
      form.email,
      form.role === "admin" ? "admin" : "user",
    );
    // Also store their desired role (teacher/student/parent) once they register — we patch via inviting & then admin can set
    toast.success(`Invitation sent to ${form.email}`);
    setOpen(false);
    setForm({ email: "", role: "teacher" });
    qc.invalidateQueries({ queryKey: ["allUsers"] });
  };

  const updateRole = async (u, role) => {
    await base44.entities.User.update(u.id, { role });
    qc.invalidateQueries({ queryKey: ["allUsers"] });
    toast.success("Role updated");
  };

  const linkStudent = async (u, studentId) => {
    await base44.entities.User.update(u.id, { student_id_ref: studentId });
    qc.invalidateQueries({ queryKey: ["allUsers"] });
    toast.success("Linked");
  };

  return (
    <div>
      <PageHeader
        title="Users & Access"
        subtitle="Invite staff and manage role-based access"
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        }
      />

      <Card>
        {users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Linked student</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[u.role] || "bg-slate-100"}>
                        {u.role || "student"}
                      </Badge>
                      <Select
                        value={u.role || "student"}
                        onValueChange={(v) => updateRole(u, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "student" || u.role === "parent" ? (
                      <Select
                        value={u.student_id_ref || ""}
                        onValueChange={(v) => linkStudent(u, v)}
                      >
                        <SelectTrigger className="w-56 h-8 text-xs">
                          <SelectValue placeholder="Link student record" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        confirm("Remove this user?") && del.mutate(u.id)
                      }
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3" />
                You can change their role after they accept the invitation.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Send invitation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
