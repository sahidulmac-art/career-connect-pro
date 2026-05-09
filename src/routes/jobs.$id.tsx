import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Briefcase, Calendar, BadgeCheck, Bookmark, BookmarkCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(id, name, logo_url, description, website, industry, location, verified)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: applied } = useQuery({
    queryKey: ["applied", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status")
        .eq("job_id", id)
        .eq("student_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("job_id", id)
        .eq("student_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save jobs");
      if (saved) {
        await supabase.from("saved_jobs").delete().eq("id", saved.id);
      } else {
        await supabase.from("saved_jobs").insert({ student_id: user.id, job_id: id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const apply = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (role !== "student") return toast.error("Only student accounts can apply.");
    setSubmitting(true);
    try {
      let resumeUrl: string | null = null;
      if (resumeFile) {
        const path = `${user.id}/${Date.now()}-${resumeFile.name}`;
        const { error: upErr } = await supabase.storage.from("resumes").upload(path, resumeFile);
        if (upErr) throw upErr;
        resumeUrl = path;
      }
      const { error } = await supabase.from("applications").insert({
        job_id: id,
        student_id: user.id,
        cover_letter: coverLetter || null,
        resume_url: resumeUrl,
      });
      if (error) throw error;
      toast.success("Application submitted!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["applied", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="mx-auto w-full max-w-4xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="mx-auto w-full max-w-4xl px-4 py-12 text-center">
          <h1 className="text-2xl font-semibold">Job not found</h1>
          <Link to="/jobs" className="mt-4 inline-block text-primary">Browse all jobs</Link>
        </div>
      </div>
    );
  }

  const company = job.companies as any;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <main className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {company?.logo_url ? (
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span>{company?.name}</span>
                    {company?.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize">{job.type}</Badge>
                    <Badge variant="outline" className="capitalize">{job.work_mode}</Badge>
                    {job.location && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" />{job.location}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Apply by {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Section title="About the role">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{job.description}</p>
            </Section>

            {job.requirements && (
              <Section title="Requirements">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{job.requirements}</p>
              </Section>
            )}

            {job.skills && job.skills.length > 0 && (
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s: string) => (
                    <span key={s} className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </main>

          <aside className="space-y-4 md:sticky md:top-20 md:self-start">
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              {applied ? (
                <Button className="w-full" disabled>
                  Applied · {applied.status}
                </Button>
              ) : (
                <Button className="w-full" onClick={() => (user ? setOpen(true) : navigate({ to: "/auth" }))}>
                  <Briefcase className="mr-2 h-4 w-4" /> Apply now
                </Button>
              )}
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => (user ? toggleSave.mutate() : navigate({ to: "/auth" }))}
              >
                {saved ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                {saved ? "Saved" : "Save job"}
              </Button>
            </div>

            {company && (
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <h4 className="text-sm font-semibold">About {company.name}</h4>
                {company.industry && <div className="mt-1 text-xs text-muted-foreground">{company.industry}</div>}
                {company.description && (
                  <p className="mt-3 line-clamp-5 text-sm text-muted-foreground">{company.description}</p>
                )}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary hover:underline">
                    Visit website →
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">Resume (PDF)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Cover letter (optional)</Label>
              <Textarea
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the team why you'd be a great fit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={apply} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}
