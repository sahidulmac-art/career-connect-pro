import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

type EducationItem = { school?: string; degree?: string; year?: string };

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    location: "",
    avatar_url: "",
    resume_url: "",
    skills: "",
    education_school: "",
    education_degree: "",
    education_year: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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

  useEffect(() => {
    if (!profile) return;
    const edu = (profile.education as EducationItem | null) ?? {};
    setForm({
      full_name: profile.full_name ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      avatar_url: profile.avatar_url ?? "",
      resume_url: profile.resume_url ?? "",
      skills: (profile.skills ?? []).join(", "),
      education_school: edu.school ?? "",
      education_degree: edu.degree ?? "",
      education_year: edu.year ?? "",
    });
  }, [profile]);

  // Scroll to hash anchor on mount/update
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        const input = el.querySelector<HTMLElement>("input,textarea");
        input?.focus();
      });
    }
  }, [profile]);

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleResumeUpload = async (file: File) => {
    if (!user) return;
    setUploadingResume(true);
    try {
      const path = `${user.id}/resume-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, resume_url: path }));
      toast.success("Resume uploaded — remember to save.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const skills = form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const education: EducationItem = {
        school: form.education_school.trim(),
        degree: form.education_degree.trim(),
        year: form.education_year.trim(),
      };
      const hasEdu = Object.values(education).some(Boolean);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim() || null,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          resume_url: form.resume_url.trim() || null,
          skills: skills.length ? skills : null,
          education: hasEdu ? education : null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your profile to get noticed by recruiters.
        </p>

        <div className="mt-6 space-y-6">
          <Section id="full_name" title="Full name">
            <Input value={form.full_name} onChange={onChange("full_name")} placeholder="Jane Doe" />
          </Section>

          <Section id="headline" title="Headline">
            <Input
              value={form.headline}
              onChange={onChange("headline")}
              placeholder="CS student passionate about backend systems"
            />
          </Section>

          <Section id="bio" title="Bio">
            <Textarea
              value={form.bio}
              onChange={onChange("bio")}
              rows={4}
              placeholder="Tell recruiters about yourself, your interests, and what you're looking for."
            />
          </Section>

          <Section id="location" title="Location">
            <Input value={form.location} onChange={onChange("location")} placeholder="Bangalore, India" />
          </Section>

          <Section id="avatar_url" title="Profile photo">
            <Input
              value={form.avatar_url}
              onChange={onChange("avatar_url")}
              placeholder="https://… image URL"
            />
            <p className="text-xs text-muted-foreground">Paste a public image URL.</p>
          </Section>

          <Section id="resume_url" title="Resume">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
                {uploadingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingResume ? "Uploading…" : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleResumeUpload(f);
                  }}
                />
              </label>
              {form.resume_url ? (
                <span className="truncate text-xs text-muted-foreground">{form.resume_url}</span>
              ) : (
                <span className="text-xs text-muted-foreground">No resume uploaded yet.</span>
              )}
            </div>
          </Section>

          <Section id="skills" title="Skills">
            <Input
              value={form.skills}
              onChange={onChange("skills")}
              placeholder="React, TypeScript, Node.js"
            />
            <p className="text-xs text-muted-foreground">Comma-separated.</p>
          </Section>

          <Section id="education" title="Education">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">School</Label>
                <Input
                  value={form.education_school}
                  onChange={onChange("education_school")}
                  placeholder="IIT Delhi"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Input
                  value={form.education_year}
                  onChange={onChange("education_year")}
                  placeholder="2026"
                />
              </div>
              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs">Degree</Label>
                <Input
                  value={form.education_degree}
                  onChange={onChange("education_degree")}
                  placeholder="B.Tech, Computer Science"
                />
              </div>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-4 mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-soft target:ring-2 target:ring-primary"
    >
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
