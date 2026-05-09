import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Companies hiring on Hireloop" },
      { name: "description", content: "Discover employers actively hiring students and graduates." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", "list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, logo_url, industry, location, verified, description")
        .order("created_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${companies.length} hiring teams on Hireloop.`}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              to="/jobs"
              search={{ q: c.name } as never}
              className="group rounded-xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {c.logo_url ? <img src={c.logo_url} className="h-full w-full object-cover" alt="" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-semibold group-hover:text-primary">{c.name}</h3>
                    {c.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.industry || "—"}</div>
                  {c.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                </div>
              </div>
            </Link>
          ))}
          {!isLoading && companies.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No companies yet.
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
