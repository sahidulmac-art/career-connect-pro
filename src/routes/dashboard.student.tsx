import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Briefcase, Bookmark, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard/student")({
  component: StudentDashboard,
});

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
