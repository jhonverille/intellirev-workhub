"use client";

import { useState, useEffect, useMemo } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useWorkHub } from "@/lib/work-hub-store";
import { makeId, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserIcon,
  LinkIcon,
  CheckIcon,
  FolderIcon,
  CheckSquareIcon,
  NoteIcon,
} from "@/components/icons";
import type { Member } from "@/lib/types";

function Avatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" | "lg" }) {
  const initials = member.displayName
    ? member.displayName[0].toUpperCase()
    : member.email[0].toUpperCase();

  const sizeClasses = {
    sm: "h-9 w-9 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-20 w-20 text-3xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} flex-shrink-0 rounded-full flex items-center justify-center font-bold bg-[var(--accent-muted)] text-[var(--accent)] border-2 border-[var(--accent)]`}
    >
      {initials}
    </div>
  );
}

export default function TeamPage() {
  const {
    data,
    user,
    userRole,
    currentWorkspaceId,
    initialized,
    isSyncing,
    workspaceLoadError,
    signOut,
  } = useWorkHub();

  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  const isOwner = userRole === "owner";
  const membersList = useMemo(
    () => Object.values(data.members || {}),
    [data.members]
  );

  const head = membersList.find((m) => m.role === "owner");
  const regularMembers = membersList
    .filter((m) => m.role !== "owner")
    .sort((a, b) => (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email));

  const isLoading =
    !workspaceLoadError && (!initialized || (!!user && !currentWorkspaceId));

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowRetry(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [isLoading]);

  // Entity counts visible to this user
  const entityCounts = useMemo(() => {
    const visibleTasks = data.tasks.filter(
      (t) => t.visibility !== "private" || t.ownerId === user?.uid || t.assigneeIds?.includes(user?.uid ?? "")
    );
    const visibleProjects = data.projects.filter(
      (p) => p.visibility !== "private" || p.ownerId === user?.uid || p.assigneeIds?.includes(user?.uid ?? "")
    );
    const visibleNotes = data.notes.filter(
      (n) => n.visibility !== "private" || n.ownerId === user?.uid || n.assigneeIds?.includes(user?.uid ?? "")
    );
    return {
      tasks: visibleTasks.length,
      projects: visibleProjects.length,
      notes: visibleNotes.length,
      links: data.links.length,
    };
  }, [data, user]);

  const handleGenerateInvite = async () => {
    if (!currentWorkspaceId || !user) return;
    setGenerating(true);
    try {
      const inviteId = makeId();
      const inviteRef = doc(db, "invites", inviteId);
      await setDoc(inviteRef, {
        workspaceId: currentWorkspaceId,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        status: "active",
      });
      const rootUrl = window.location.origin;
      setInviteLink(`${rootUrl}/invite/${inviteId}`);
      setCopied(false);
    } catch (err) {
      console.error("Failed to generate invite:", err);
      alert("Failed to generate invite link. Ensure you have network connectivity.");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (workspaceLoadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="rounded-lg border border-[var(--line)] bg-card p-8 shadow-sm max-w-md w-full space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Workspace Unavailable</h2>
          <p className="text-sm text-[var(--muted)]">{workspaceLoadError}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button variant="ghost" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="text-[var(--muted)] animate-pulse">
          {showRetry
            ? "Still loading... This might take a moment."
            : "Loading workspace details..."}
        </div>
        {showRetry && (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Workspace"
        title="Team"
        description="Everyone collaborating in this workspace. The Head owns and manages the workspace."
      />

      {/* ── Head / Workspace Owner Card ── */}
      {head && (
        <Surface className="p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_70%,var(--background))] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
              Workspace Head
            </p>
            <h2 className="text-lg font-bold">
              {data.name || "This Workspace"}
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar member={head} size="lg" />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-2xl font-bold text-[var(--foreground)]">
                    {head.displayName || "Workspace Head"}
                  </h3>
                  {head.uid === user?.uid && (
                    <span className="text-[10px] font-bold bg-[var(--accent)] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)]">{head.email}</p>
                <p className="text-xs text-[var(--muted)]">
                  Head since {formatDate(head.joinedAt)}
                </p>

                {/* Entity counts */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-strong)] px-3 py-1.5 rounded-full">
                    <CheckSquareIcon className="h-3.5 w-3.5" />
                    {entityCounts.tasks} tasks
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-strong)] px-3 py-1.5 rounded-full">
                    <FolderIcon className="h-3.5 w-3.5" />
                    {entityCounts.projects} projects
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-strong)] px-3 py-1.5 rounded-full">
                    <NoteIcon className="h-3.5 w-3.5" />
                    {entityCounts.notes} notes
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-strong)] px-3 py-1.5 rounded-full">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {entityCounts.links} links
                  </span>
                </div>
              </div>

              <Badge tone="accent" className="hidden sm:inline-flex self-start">
                Head
              </Badge>
            </div>
          </div>
        </Surface>
      )}

      {/* ── Members Grid ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
            Members ({regularMembers.length})
          </h3>
          <div className="h-px flex-1 bg-[var(--line)] opacity-50" />
        </div>

        {regularMembers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regularMembers.map((member) => (
              <Surface
                key={member.uid}
                className="p-5 flex flex-col gap-3 hover:translate-y-[-2px] transition-transform duration-200"
              >
                <div className="flex items-center gap-3">
                  <Avatar member={member} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {member.displayName || "Unknown User"}
                      </h4>
                      {member.uid === user?.uid && (
                        <span className="text-[10px] font-bold bg-[var(--muted)] text-[var(--foreground)] px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-70">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--line)] pt-3 mt-1">
                  <span className="capitalize px-2 py-1 bg-[var(--surface-strong)] rounded-full font-medium">
                    Member
                  </span>
                  <span>Joined {formatDate(member.joinedAt)}</span>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface className="p-8 text-center">
            <UserIcon className="h-8 w-8 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No members yet</p>
            <p className="text-sm text-[var(--muted)]">
              {isOwner
                ? "Generate an invite link below to bring collaborators into this workspace."
                : "The workspace head hasn't invited any members yet."}
            </p>
          </Surface>
        )}
      </div>

      {/* ── Invite section — owner only ── */}
      {isOwner && (
        <Surface className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Invite New Members
            </h2>
            <p className="text-sm text-[var(--muted)] mt-1 leading-6">
              Share a link to let collaborators join this workspace as members. Each link is single-use and expires when accepted.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleGenerateInvite}
              disabled={generating}
              icon={<UserIcon className="h-4 w-4" />}
              className="w-full sm:w-auto shrink-0"
            >
              {generating ? "Generating..." : "Generate Invite Link"}
            </Button>

            {inviteLink && (
              <div className="flex w-full items-center gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1 font-mono text-sm h-11"
                />
                <Button
                  variant="secondary"
                  onClick={copyToClipboard}
                  icon={
                    copied ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )
                  }
                  className="h-11 shrink-0"
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>
        </Surface>
      )}
    </div>
  );
}
