import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Briefcase, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/company")({
  component: CompanyDashboard,
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CompanyDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && user && role && role !== "company")
      navigate({ to: "/dashboard/student" });
  }, [user, role, loading, navigate]);

  const { data: company, isLoading: cLoading } = useQuery({
    queryKey: ["my-company", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["company-jobs", company?.id],
    enabled: !!company,
    queryFn: async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, type, work_mode, is_active, created_at, applications(count)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user || cLoading) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {!company ? (
          <CreateCompany onDone={() => qc.invalidateQueries({ queryKey: ["my-company"] })} />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{company.industry ?? "—"}</p>
              </div>
              <PostJobDialog companyId={company.id} onDone={() => qc.invalidateQueries({ queryKey: ["company-jobs"] })} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Stat icon={<Briefcase />} label="Active jobs" value={jobs.filter((j: any) => j.is_active).length} />
              <Stat icon={<Users />} label="Total applications" value={jobs.reduce((s: number, j: any) => s + (j.applications?.[0]?.count ?? 0), 0)} />
              <Stat icon={<Building2 />} label="Listings" value={jobs.length} />
            </div>

            <section className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="mb-3 text-base font-semibold">Your listings</h2>
              {jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No jobs posted yet. Click "Post a job" to get started.
                </div>
              ) : (
                <ul className="divide-y">
                  {jobs.map((j: any) => (
                    <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <Link to="/dashboard/jobs/$id/applicants" params={{ id: j.id }} className="min-w-0 flex-1">
                        <div className="font-medium hover:text-primary">{j.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="capitalize">{j.type}</Badge>
                          <Badge variant="outline" className="capitalize">{j.work_mode}</Badge>
                          {!j.is_active && <Badge variant="outline">Closed</Badge>}
                        </div>
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {j.applications?.[0]?.count ?? 0} applicants
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>{label}
      </div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function CreateCompany({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("companies").insert({
      owner_id: user.id, name, industry, website, description, slug,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Company created!");
    onDone();
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-card p-8 shadow-card">
      <h1 className="text-xl font-semibold">Set up your company</h1>
      <p className="mt-1 text-sm text-muted-foreground">This is what students will see.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><Label className="mb-1.5 block text-sm">Company name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label className="mb-1.5 block text-sm">Industry</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
        <div><Label className="mb-1.5 block text-sm">Website</Label><Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
        <div><Label className="mb-1.5 block text-sm">Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create company"}</Button>
      </form>
    </div>
  );
}

function PostJobDialog({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "job", work_mode: "onsite", location: "",
    salary_min: "", salary_max: "", description: "", requirements: "",
    skills: "", experience_level: "entry",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("jobs").insert({
        company_id: companyId,
        title: form.title,
        type: form.type as any,
        work_mode: form.work_mode as any,
        location: form.location || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        description: form.description,
        requirements: form.requirements || null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience_level: form.experience_level as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job posted!");
      setOpen(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Post a job</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Post a new role</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label className="mb-1.5 block text-sm">Title</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="job">Full-time job</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Work mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => set("work_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block text-sm">Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div>
              <Label className="mb-1.5 block text-sm">Experience</Label>
              <Select value={form.experience_level} onValueChange={(v) => set("experience_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block text-sm">Salary min</Label><Input type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} /></div>
            <div><Label className="mb-1.5 block text-sm">Salary max</Label><Input type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} /></div>
          </div>
          <div><Label className="mb-1.5 block text-sm">Skills (comma separated)</Label><Input value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, Node.js" /></div>
          <div><Label className="mb-1.5 block text-sm">Description</Label><Textarea rows={5} required value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div><Label className="mb-1.5 block text-sm">Requirements</Label><Textarea rows={3} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Posting…" : "Publish job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
