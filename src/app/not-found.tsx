import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Surface className="w-full max-w-2xl p-8 text-center sm:p-10">
        <span className="inline-flex overflow-hidden rounded-[14px] bg-[var(--surface-strong)] p-1">
          <Image src="/logo.png" alt="Work Hub Logo" width={24} height={24} className="h-6 w-6 rounded-[14px] object-cover" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          This page slipped off the board.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
          The destination you tried to open does not exist anymore, or the link
          was never valid in this workspace.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard">
            <Button icon={<ArrowRightIcon className="h-5 w-5" />}>
              Return to dashboard
            </Button>
          </Link>
        </div>
      </Surface>
    </main>
  );
}
