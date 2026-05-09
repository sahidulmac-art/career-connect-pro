import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Briefcase, GraduationCap } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["student", "company"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "company">(search.role ?? "student");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && role) {
      navigate({ to: role === "company" ? "/dashboard/company" : "/dashboard/student" });
    }
  }, [user, role, navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role: signupRole },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email if confirmation is enabled.");
  };

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
        <div className="w-full rounded-2xl border bg-card p-8 shadow-card">
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {tab === "signin" ? "Sign in to continue to Hireloop" : "Join thousands hiring & getting hired"}
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={onSignIn} className="space-y-4">
                <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" id="password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={onSignUp} className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm">I am a…</Label>
                  <RadioGroup
                    value={signupRole}
                    onValueChange={(v) => setSignupRole(v as "student" | "company")}
                    className="grid grid-cols-2 gap-2"
                  >
                    <RoleOption value="student" current={signupRole} icon={<GraduationCap className="h-4 w-4" />} label="Student" />
                    <RoleOption value="company" current={signupRole} icon={<Briefcase className="h-4 w-4" />} label="Company" />
                  </RadioGroup>
                </div>
                <Field label="Full name" id="name" value={fullName} onChange={setFullName} />
                <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" id="password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
            <GoogleIcon className="mr-2 h-4 w-4" /> Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, id, type = "text", value, onChange,
}: { label: string; id: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      <Input id={id} type={type} value={value} required onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RoleOption({
  value, current, icon, label,
}: { value: string; current: string; icon: React.ReactNode; label: string }) {
  const active = value === current;
  return (
    <Label
      htmlFor={`role-${value}`}
      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
        active ? "border-primary bg-primary-soft text-primary" : "hover:bg-muted"
      }`}
    >
      <RadioGroupItem id={`role-${value}`} value={value} className="sr-only" />
      {icon} {label}
    </Label>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#EA4335" d="M12 11v3.2h7.4c-.3 1.7-2 5-7.4 5-4.5 0-8.1-3.7-8.1-8.2S7.5 2.8 12 2.8c2.5 0 4.2.9 5.2 1.9L19.5 2.5C17.9 1 15.4 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"/>
    </svg>
  );
}
