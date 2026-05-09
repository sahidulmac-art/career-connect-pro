import { Link } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold">Hireloop</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Where students and companies meet for jobs and internships.
          </p>
        </div>
        <FooterCol title="Students" links={[["Browse jobs", "/jobs"], ["Sign up", "/auth"]]} />
        <FooterCol title="Companies" links={[["Post a job", "/auth"], ["Browse talent", "/companies"]]} />
        <FooterCol title="Company" links={[["About", "/"], ["Contact", "/"]]} />
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Hireloop. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link to={href} className="hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
