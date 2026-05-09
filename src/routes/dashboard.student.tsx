import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Briefcase, Bookmark, FileText, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { JobCard, type JobCardData } from "@/components/job-card";

export const Route = createFileRoute("/dashboard/student")({
  component: StudentDashboard,
});

const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: "full_name", label: "Add your full name" },
  { key: "headline", label: "Write a short headline" },
  { key: "bio", label: "Add a bio" },
  { key: "location", label: "Set your location" },
  { key: "avatar_url", label: "Upload a profile photo" },
  { key: "resume_url", label: "Upload your resume" },
  { key: "skills", label: "List your skills" },
  { key: "education", label: "Add education details" },
];

function StudentDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && role && role !== "student")
      navigate({ to: "/dashboard/company" });
  }, [user, role, loading, navigate]);

  const { data: applications = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, created_at, jobs(id, title, companies(name, logo_url))")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: saved = [] } = useQuery({
    queryKey: ["my-saved", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_jobs")
        .select("id, jobs(id, title, companies(name, logo_url))")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const profileChecks = useMemo(() => {
    return PROFILE_FIELDS.map((f) => {
      const v = (profile as any)?.[f.key];
      const done = Array.isArray(v)
        ? v.length > 0
        : typeof v === "object" && v !== null
          ? Object.keys(v).length > 0
          : Boolean(v && String(v).trim());
      return { ...f, done };
    });
  }, [profile]);

  const completionPct = Math.round(
    (profileChecks.filter((c) => c.done).length / profileChecks.length) * 100,
  );

  const appliedJobIds = useMemo(
    () => new Set(applications.map((a: any) => a.jobs?.id).filter(Boolean)),
    [applications],
  );

  const { data: recommended = [] } = useQuery({
    queryKey: ["recommended-jobs", user?.id, profile?.skills],
    enabled: !!user,
    queryFn: async (): Promise<JobCardData[]> => {
      const skills = (profile?.skills as string[] | null) ?? [];
      let query = supabase
        .from("jobs")
        .select(
          "id, title, type, work_mode, location, salary_min, salary_max, currency, skills, created_at, companies(name, logo_url, verified)",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (skills.length > 0) query = query.overlaps("skills", skills);
      const { data } = await query;
      return (data as any) ?? [];
    },
  });

  const recommendedFiltered = recommended
    .filter((j) => !appliedJobIds.has(j.id))
    .slice(0, 4);

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your applications and saved jobs.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Briefcase />} label="Applications" value={applications.length} />
          <Stat icon={<Bookmark />} label="Saved jobs" value={saved.length} />
          <Stat icon={<FileText />} label="Interviews" value={applications.filter((a: any) => a.status === "interview").length} />
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Profile completion</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A complete profile gets up to 5× more views from recruiters.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{completionPct}%</div>
              <div className="text-xs text-muted-foreground">
                {profileChecks.filter((c) => c.done).length} of {profileChecks.length} complete
              </div>
            </div>
          </div>
          <Progress value={completionPct} className="mt-4" />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {profileChecks.map((c) => (
              <li key={c.key}>
                <Link
                  to="/profile"
                  hash={c.key}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm transition-colors hover:bg-muted"
                >
                  {c.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={
                      c.done
                        ? "text-muted-foreground line-through group-hover:text-foreground"
                        : "group-hover:text-primary"
                    }
                  >
                    {c.label}
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {c.done ? "Edit →" : "Add →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Recommended for you</h2>
            </div>
            <Link to="/jobs" className="text-sm text-primary hover:underline">
              See all →
            </Link>
          </div>
          {recommendedFiltered.length === 0 ? (
            <Empty
              text={
                (profile?.skills as string[] | null)?.length
                  ? "No new matches right now — check back soon."
                  : "Add skills to your profile to unlock personalized recommendations."
              }
              cta="Browse all jobs"
              to="/jobs"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendedFiltered.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          )}
        </section>

        <Card title="My applications">
          {applications.length === 0 ? (
            <Empty cta="Browse jobs" to="/jobs" text="You haven't applied to anything yet." />
          ) : (
            <ul className="divide-y">
              {applications.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to="/jobs/$id" params={{ id: a.jobs.id }} className="min-w-0 flex-1">
                    <div className="font-medium hover:text-primary">{a.jobs.title}</div>
                    <div className="text-xs text-muted-foreground">{a.jobs.companies?.name}</div>
                  </Link>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Saved jobs">
          {saved.length === 0 ? (
            <Empty cta="Discover jobs" to="/jobs" text="No saved jobs yet." />
          ) : (
            <ul className="divide-y">
              {saved.map((s: any) => (
                <li key={s.id} className="py-3">
                  <Link to="/jobs/$id" params={{ id: s.jobs.id }} className="font-medium hover:text-primary">
                    {s.jobs.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{s.jobs.companies?.name}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text, cta, to }: { text: string; cta: string; to: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}{" "}
      <Link to={to} className="text-primary hover:underline">{cta} →</Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    applied: "bg-muted text-muted-foreground",
    shortlisted: "bg-primary-soft text-primary",
    interview: "bg-warning/20 text-warning-foreground",
    selected: "bg-success/20 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <Badge className={`${map[status] ?? ""} capitalize`} variant="secondary">
      {status}
    </Badge>
  );
}
