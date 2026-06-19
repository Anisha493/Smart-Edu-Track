import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Megaphone, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { createNotification, sendEmailSafe } from "@/lib/roleUtils";

const priorityColors = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function Announcements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canPost = user?.role === "admin" || user?.role === "teacher";
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all",
    class_id: "",
    priority: "normal",
    send_email: false,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date"),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.Class.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: canPost,
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Removed");
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.body) {
      toast.error("Title and body required");
      return;
    }
    await base44.entities.Announcement.create({
      ...form,
      author_email: user.email,
      author_name: user.full_name,
    });

    // Fan-out to in-app notifications + optional emails
    let recipients = [];
    if (form.audience === "teachers")
      recipients = users
        .filter((u) => u.role === "teacher")
        .map((u) => u.email);
    else if (form.audience === "students")
      recipients = users
        .filter((u) => u.role === "student")
        .map((u) => u.email);
    else if (form.audience === "parents")
      recipients = users.filter((u) => u.role === "parent").map((u) => u.email);
    else if (form.audience === "all") recipients = users.map((u) => u.email);

    await Promise.all(
      recipients.filter(Boolean).map((em) =>
        createNotification({
          user_email: em,
          title: `📣 ${form.title}`,
          body: form.body,
          type: "announcement",
        }),
      ),
    );

    if (form.send_email) {
      await Promise.all(
        recipients
          .filter(Boolean)
          .map((em) =>
            sendEmailSafe(
              em,
              `EduTrack Announcement: ${form.title}`,
              `<h3>${form.title}</h3><p>${form.body}</p><p>— ${user.full_name}</p>`,
            ),
          ),
      );
    }

    qc.invalidateQueries({ queryKey: ["announcements"] });
    setOpen(false);
    setForm({
      title: "",
      body: "",
      audience: "all",
      class_id: "",
      priority: "normal",
      send_email: false,
    });
    toast.success("Announcement posted");
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Keep the community informed with timely updates"
        actions={
          canPost && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          )
        }
      />

      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="No announcements yet" />
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className={priorityColors[a.priority]}>
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {a.audience}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {a.created_date &&
                        formatDistanceToNow(new Date(a.created_date), {
                          addSuffix: true,
                        })}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-lg">
                    {a.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    — {a.author_name || a.author_email}
                  </p>
                </div>
                {canPost &&
                  (a.author_email === user.email || user.role === "admin") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => confirm("Remove?") && del.mutate(a.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Body *</Label>
              <Textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={form.audience}
                  onValueChange={(v) => setForm({ ...form, audience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                    <SelectItem value="class">Specific class</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.audience === "class" && (
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select
                  value={form.class_id}
                  onValueChange={(v) => setForm({ ...form, class_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.send_email}
                onCheckedChange={(v) => setForm({ ...form, send_email: v })}
              />
              <Label>Also send as email</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Post</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
