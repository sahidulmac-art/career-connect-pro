import { Link } from "@tanstack/react-router";
import { MapPin, Clock, BadgeCheck, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface JobCardData {
  id: string;
  title: string;
  type: "job" | "internship";
  work_mode: "remote" | "hybrid" | "onsite";
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  skills: string[] | null;
  created_at: string;
  companies: { name: string; logo_url: string | null; verified: boolean } | null;
}

function formatSalary(min: number | null, max: number | null, ccy: string | null) {
  if (!min && !max) return null;
  const c = ccy ?? "USD";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : n);
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`;
  return `${c} ${fmt((min ?? max)!)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function JobCard({ job }: { job: JobCardData }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);
  return (
    <Link
      to="/jobs/$id"
      params={{ id: job.id }}
      className="group block rounded-xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {job.companies?.logo_url ? (
            <img src={job.companies.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
              {job.title}
            </h3>
            <Badge variant="secondary" className="capitalize">
              {job.type}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{job.companies?.name ?? "—"}</span>
            {job.companies?.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.work_mode === "remote" ? "Remote" : job.location || "—"}
              {job.work_mode !== "remote" && (
                <span className="ml-1 capitalize text-foreground/60">· {job.work_mode}</span>
              )}
            </span>
            {salary && <span className="font-medium text-foreground">{salary}</span>}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(job.created_at)}
            </span>
          </div>
          {job.skills && job.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
