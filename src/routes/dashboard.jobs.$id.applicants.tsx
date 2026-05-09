import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUSES = ["applied", "shortlisted", "interview", "rejected", "selected"] as const;

export const Route = createFileRoute("/dashboard/jobs/$id/applicants")({
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: job } = useQuery({
    queryKey: ["job-min", id],
    queryFn: async () => {
      const { data } = await supabase.from("jobs").select("id, title").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: apps = [] } = useQuery({
    queryKey: ["job-apps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, cover_letter, resume_url, created_at, profiles:student_id(full_name, headline, avatar_url, location, skills)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status: status as any }).eq("id", appId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["job-apps", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadResume = async (path: string) => {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return toast.error("Could not get resume link");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Link to="/dashboard/company" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Applicants · {job?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{apps.length} candidates</p>

        <div className="mt-6 space-y-3">
          {apps.map((a: any) => (
            <div key={a.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.profiles?.full_name ?? "Anonymous"}</div>
                  {a.profiles?.headline && (
                    <div className="text-sm text-muted-foreground">{a.profiles.headline}</div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    Applied {new Date(a.created_at).toLocaleDateString()}
                    {a.profiles?.location && ` · ${a.profiles.location}`}
                  </div>
                  {a.profiles?.skills && a.profiles.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.profiles.skills.slice(0, 6).map((s: string) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {a.cover_letter && (
                    <p className="mt-3 line-clamp-3 text-sm text-foreground/80">{a.cover_letter}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Select
                    value={a.status}
                    onValueChange={(v) => updateStatus.mutate({ appId: a.id, status: v })}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {a.resume_url && (
                    <Button size="sm" variant="outline" onClick={() => downloadResume(a.resume_url)}>
                      <Download className="mr-2 h-3.5 w-3.5" /> Resume
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No applicants yet.
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
