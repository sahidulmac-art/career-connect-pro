import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, TrendingUp, Users, ArrowRight, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard, type JobCardData } from "@/components/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: jobs } = useQuery({
    queryKey: ["jobs", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, type, work_mode, location, salary_min, salary_max, currency, skills, created_at, companies(name, logo_url, verified)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as unknown as JobCardData[];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, logo_url, industry, verified")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/jobs", search: { q } as never });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.06_255/0.6),transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Trusted by 500+ companies hiring students
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
              Find your next{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                internship or job
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Apply to thousands of opportunities from startups and enterprises.
              Built for students. Loved by recruiters.
            </p>

            <form
              onSubmit={onSearch}
              className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border bg-surface p-2 shadow-card"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by role, skill or company"
                  className="h-11 border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-11">
                Search
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              {["Frontend", "Data Science", "Product Design", "Marketing", "Backend"].map((t) => (
                <button
                  key={t}
                  onClick={() => navigate({ to: "/jobs", search: { q: t } as never })}
                  className="rounded-full border bg-surface px-3 py-1 transition-colors hover:bg-muted"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
          <Stat icon={<TrendingUp className="h-4 w-4" />} value="12,400+" label="Open roles" />
          <Stat icon={<Users className="h-4 w-4" />} value="80,000" label="Students" />
          <Stat icon={<BadgeCheck className="h-4 w-4" />} value="500+" label="Verified employers" />
          <Stat icon={<Sparkles className="h-4 w-4" />} value="92%" label="Apply in <2 min" />
        </div>
      </section>

      {/* Featured companies */}
      {companies && companies.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Featured companies</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {companies.map((c) => (
              <div
                key={c.id}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium">{c.name}</div>
                {c.industry && (
                  <div className="text-xs text-muted-foreground">{c.industry}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Latest jobs */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Latest opportunities</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fresh roles posted by hiring teams.
            </p>
          </div>
          <Link to="/jobs" className="text-sm font-medium text-primary hover:underline">
            Browse all →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {jobs && jobs.length > 0 ? (
            jobs.map((j) => <JobCard key={j.id} job={j} />)
          ) : (
            <div className="col-span-2 rounded-xl border border-dashed bg-surface p-10 text-center text-sm text-muted-foreground">
              No jobs yet — be the first company to post a role.
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-soft">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold">Hiring for your team?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reach thousands of qualified candidates in minutes.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate({ to: "/auth", search: { mode: "signup", role: "company" } as never })}>
            Post a job <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
