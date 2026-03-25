import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  CheckSquareIcon,
  DashboardIcon,
  FolderIcon,
  LinkIcon,
  NoteIcon,
  SparkIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

const features = [
  {
    title: "One calm workspace",
    description:
      "Keep tasks, active projects, notes, and the links you actually use in one focused place.",
    icon: <DashboardIcon className="h-5 w-5" />,
  },
  {
    title: "Built for daily use",
    description:
      "Fast local-first interactions, sensible defaults, and layouts that prioritize clarity over noise.",
    icon: <CheckSquareIcon className="h-5 w-5" />,
  },
  {
    title: "Simple, extendable structure",
    description:
      "Readable Next.js code with reusable components and client-side persistence you can grow later.",
    icon: <SparkIcon className="h-5 w-5" />,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6">
        <Surface className="relative overflow-hidden px-6 py-6 sm:px-8 lg:px-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-transparent" />
          <header className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <span className="inline-flex items-center gap-3 rounded-full bg-[var(--surface-strong)] pr-4 pl-2 py-2 text-sm font-medium text-[var(--foreground)]">
                <Image src="/logo.png" alt="Work Hub" width={32} height={32} className="h-8 w-auto object-contain" />
                Work Hub
              </span>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-[family-name:var(--font-newsreader)] text-5xl leading-tight tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                  A focused home for the work you actually want to keep moving.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                  Work Hub brings together tasks, projects, notes, and quick
                  links in a single personal dashboard that feels calm,
                  practical, and ready for everyday use.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard">
                  <Button size="lg" icon={<ArrowRightIcon className="h-5 w-5" />}>
                    Open dashboard
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button variant="secondary" size="lg">
                    Explore tasks
                  </Button>
                </Link>
              </div>
            </div>

            <Surface className="relative max-w-xl flex-1 bg-[color-mix(in_srgb,var(--surface)_70%,white)] p-5">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-[var(--surface-strong)] p-4">
                    <p className="text-sm text-[var(--muted)]">Today&apos;s focus</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      Weekly planning
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Review priorities, clear blockers, and lock in three
                      meaningful outcomes.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--line)] p-4">
                    <p className="text-sm text-[var(--muted)]">Project pulse</p>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Active</span>
                        <span className="font-semibold">3</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-strong)]">
                        <div className="h-2 w-2/3 rounded-full bg-[var(--accent)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-[var(--line)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Quick capture
                    </p>
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                      Local-first
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl bg-[var(--surface-strong)] p-4">
                      <FolderIcon className="h-5 w-5 text-[var(--accent)]" />
                      <p className="mt-4 text-sm font-semibold">Projects</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Clear status and deadlines.
                      </p>
                    </div>
                    <div className="rounded-3xl bg-[var(--surface-strong)] p-4">
                      <NoteIcon className="h-5 w-5 text-[var(--accent)]" />
                      <p className="mt-4 text-sm font-semibold">Notes</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Tagged notes you can find fast.
                      </p>
                    </div>
                    <div className="rounded-3xl bg-[var(--surface-strong)] p-4">
                      <LinkIcon className="h-5 w-5 text-[var(--accent)]" />
                      <p className="mt-4 text-sm font-semibold">Quick links</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Save the pages you reach for often.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </header>
        </Surface>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Surface className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Design direction
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Focused Canvas
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Work Hub uses a spacious, low-noise visual system with soft
              neutrals, disciplined typography, subtle shadows, and one
              restrained accent. The result feels premium and productive without
              leaning sterile or flashy.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5"
                >
                  <span className="inline-flex rounded-2xl bg-[var(--surface-strong)] p-2 text-[var(--accent)]">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Built for the day
            </p>
            <div className="mt-4 space-y-5">
              <div className="rounded-[24px] bg-[var(--surface-strong)] p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Plan what matters
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  See what is due, what is active, and what has enough momentum
                  to keep going.
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-strong)] p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Keep context nearby
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Notes and quick links stay connected to work instead of living
                  in separate tabs and apps.
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-strong)] p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Stay personal
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  No backend, no account setup, and no unnecessary abstractions
                  between you and the work.
                </p>
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </main>
  );
}
