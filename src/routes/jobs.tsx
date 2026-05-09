import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JobCard, type JobCardData } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const searchSchema = z.object({
  q: z.string().optional(),
  type: z.enum(["job", "internship"]).optional(),
});

export const Route = createFileRoute("/jobs")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse jobs & internships — Hireloop" },
      { name: "description", content: "Search and filter open roles from verified companies." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [types, setTypes] = useState<Set<string>>(new Set(search.type ? [search.type] : []));
  const [modes, setModes] = useState<Set<string>>(new Set());

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, type, work_mode, location, salary_min, salary_max, currency, skills, description, created_at, companies(name, logo_url, verified)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as (JobCardData & { description: string })[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (types.size && !types.has(j.type)) return false;
      if (modes.size && !modes.has(j.work_mode)) return false;
      if (!term) return true;
      const hay =
        j.title + " " + (j.companies?.name ?? "") + " " + (j.skills ?? []).join(" ") + " " + j.description;
      return hay.toLowerCase().includes(term);
    });
  }, [jobs, q, types, modes]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs, companies, skills"
            className="h-12 pl-10"
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border bg-card p-5 shadow-soft md:sticky md:top-20 md:self-start">
            <FilterGroup title="Type">
              {(["job", "internship"] as const).map((t) => (
                <FilterRow
                  key={t}
                  label={t === "job" ? "Full-time" : "Internship"}
                  checked={types.has(t)}
                  onChange={() => toggle(types, setTypes, t)}
                />
              ))}
            </FilterGroup>
            <FilterGroup title="Work mode">
              {(["remote", "hybrid", "onsite"] as const).map((t) => (
                <FilterRow
                  key={t}
                  label={t.charAt(0).toUpperCase() + t.slice(1)}
                  checked={modes.has(t)}
                  onChange={() => toggle(modes, setModes, t)}
                />
              ))}
            </FilterGroup>
          </aside>

          <div>
            <div className="mb-4 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`}
            </div>
            <div className="grid gap-4">
              {filtered.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
              {!isLoading && filtered.length === 0 && (
                <div className="rounded-xl border border-dashed bg-surface p-10 text-center text-sm text-muted-foreground">
                  No jobs match your filters. <Link to="/jobs" className="text-primary">Clear filters</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <Label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} /> {label}
    </Label>
  );
}
