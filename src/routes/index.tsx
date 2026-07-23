import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import {
  Target, Brain, RefreshCw, TrendingUp, Zap, CheckCircle2, Sparkles, Command,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">{BRAND.name}</span>
            <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Alpha
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth" search={{ mode: "login" }}>Log in</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get access</Link></Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border/60" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Private alpha for founders, executives, and operators
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
            {BRAND.tagline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {BRAND.description}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}>Get alpha access</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/auth" search={{ mode: "login" }}>Log in</Link></Button>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-semibold">Built for operators, not students.</h2>
          <p className="mb-12 text-center text-muted-foreground">Decision-first surfaces. Real capacity. Fast recovery.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Target, title: "Outcomes over todos", body: "Two-level hierarchy: strategic outcomes with metrics, deadlines, and constraints." },
              { icon: Command, title: "Command Center", body: "Decision-first dashboard: next best action, capacity, overload warnings, recent shocks." },
              { icon: Brain, title: "AI Coach", body: "Voice or text. Reads your data, takes action — create outcomes, log check-ins, plan the day." },
              { icon: Zap, title: "If-then intentions", body: "Pre-decide behavior. Every task can carry a trigger, action, obstacle, and backup." },
              { icon: RefreshCw, title: "Professional recovery", body: "Contain the shock, protect the critical outcome, restart in 10 minutes." },
              { icon: TrendingUp, title: "Execution telemetry", body: "Sleep, energy, stress, capacity, completion — the inputs that drive output." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-2 text-center text-3xl font-semibold">Grounded in behavior science</h2>
          <p className="mb-10 text-center text-muted-foreground">Every surface is backed by proven research.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Implementation intentions", "Friction reduction", "Self-monitoring",
              "Recovery mindset", "Identity-based habits", "Behavioral economics",
              "Health–performance feedback", "Reflection & obstacle planning",
            ].map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Join the private alpha</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Alpha Momentum is free during the private alpha.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}>Get alpha access</Link></Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND.name} · Private alpha · Not medical advice.
      </footer>
    </div>
  );
}
