import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import {
  Target,
  Brain,
  Heart,
  RefreshCw,
  TrendingUp,
  Zap,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      { name: "description", content: BRAND.description },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">{BRAND.name}</span>
            <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Private Beta
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border/60"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Now in private beta for ambitious students
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
            {BRAND.tagline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {BRAND.description}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Join Beta</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            For productivity & wellness habit support. Not medical advice or therapy.
          </p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">The Problem</div>
            <h2 className="mb-3 text-2xl font-semibold">Knowing isn't doing.</h2>
            <p className="text-muted-foreground">
              Many ambitious students know what they should do, but struggle to execute consistently
              because of procrastination, distraction, low energy, poor planning, and weak recovery
              after falling behind.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">The Solution</div>
            <h2 className="mb-3 text-2xl font-semibold">Execution by design.</h2>
            <p className="text-muted-foreground">
              {BRAND.name} helps students turn goals into specific actions, build healthier routines,
              recover from setbacks, and track progress using psychology-based behavior design.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-3xl font-semibold">Key features</h2>
          <p className="mb-12 text-center text-muted-foreground">Everything you need to plan, act, and recover.</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Target, title: "Weekly goals", body: "Turn ambition into concrete weekly outcomes with a clear 'why' and smallest next action." },
              { icon: Zap, title: "Today's tasks + if-then plans", body: "Every task gets an implementation intention so you know exactly when, where, and how." },
              { icon: Brain, title: "AI task breakdown", body: "Drop in any big goal. Get the tiny first step, 25-min plan, and a backup if you stall." },
              { icon: Heart, title: "Daily check-ins", body: "Track sleep, energy, focus, and wins. See how your health drives your performance." },
              { icon: RefreshCw, title: "Recovery mode", body: "Fell behind? Restart without guilt. A calm, practical plan to get the most important thing done." },
              { icon: TrendingUp, title: "Progress that compounds", body: "Streaks, trends, and identity-based badges that reinforce who you're becoming." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
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

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-8 text-center text-3xl font-semibold">Built for ambitious students</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {["High school + AP", "SAT / ACT prep", "Competitions & research", "College applications"].map((x) => (
            <div key={x} className="rounded-xl border border-border bg-card p-5 text-center text-sm font-medium shadow-sm">
              {x}
            </div>
          ))}
        </div>
      </section>

      {/* Psychology */}
      <section className="border-y border-border/60 bg-muted/40 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-2 text-center text-3xl font-semibold">Psychology-based method</h2>
          <p className="mb-10 text-center text-muted-foreground">
            Every feature is grounded in proven behavior-change research.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Implementation intentions",
              "Friction reduction",
              "Self-monitoring",
              "Recovery mindset",
              "Positive reinforcement",
              "Identity-based habits",
              "Behavioral economics",
              "Health–performance feedback",
              "Reflection & obstacle planning",
            ].map((p) => (
              <div key={p} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Get beta access</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join the first cohort of students building real execution habits. Free during private beta.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Join Beta</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {BRAND.name} · Private beta · Not medical advice.
      </footer>
    </div>
  );
}
