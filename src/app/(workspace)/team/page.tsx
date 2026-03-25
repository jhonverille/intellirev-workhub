"use client";

import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useWorkHub } from "@/lib/work-hub-store";
import { makeId, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { UserIcon, LinkIcon, CheckIcon } from "@/components/icons";

export default function TeamPage() {
  const { data, user, currentWorkspaceId, userRole, initialized, isSyncing, workspaceLoadError, signOut } = useWorkHub();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const isOwner = userRole === "owner";
  const membersList = Object.values(data.members || {});
  
  // Loading: waiting for init OR for currentWorkspaceId to resolve (but NOT if there's an error)
  const isLoading = !workspaceLoadError && (!initialized || (!!user && !currentWorkspaceId));

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowRetry(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [isLoading]);

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
           {showRetry ? "Still loading... This might take a moment." : "Loading workspace details..."}
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
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Workspace"
        title="Team Members"
        description="Collaborate with your team by inviting them to this workspace."
      />

      {isOwner ? (
        <Surface className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Invite New Members</h2>
          <p className="text-sm leading-6 text-[var(--muted)] mb-6">
            Share an invite link to allow others to join this workspace as an Assignee.
          </p>
          
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
                <Input value={inviteLink} readOnly className="flex-1 font-mono text-sm h-11" />
                <Button 
                  variant="secondary" 
                  onClick={copyToClipboard} 
                  icon={copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4" />}
                  className="h-11 shrink-0"
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>
        </Surface>
      ) : (
        <Surface className="p-6 border-dashed border-2">
          <p className="text-sm text-[var(--muted)] text-center">
            Only the workspace owner can invite new members.
          </p>
        </Surface>
      )}

      <div className="space-y-12">
        {/* Workspace Owner Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Workspace Owner</h3>
            <div className="h-px flex-1 bg-[var(--line)] opacity-50" />
          </div>
          <div className="max-w-md">
            {membersList.filter(m => m.role === 'owner').map((member) => (
              <Surface key={member.uid} className="p-5 flex flex-col gap-3 border-l-4 border-l-[var(--accent)] shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 flex-shrink-0 bg-[var(--accent-muted)] rounded-full flex items-center justify-center text-[var(--accent)] font-bold text-xl border-2 border-[var(--accent)]">
                    {member.displayName ? member.displayName[0].toUpperCase() : member.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[var(--foreground)] truncate">
                        {member.displayName || "Unknown User"}
                      </h4>
                      {member.uid === user?.uid && (
                        <span className="text-[10px] font-bold bg-[var(--accent)] text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted)] truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--line)] pt-3">
                  <div className="flex items-center gap-2">
                    <span className="capitalize px-2 py-1 bg-[var(--accent-muted)] text-[var(--accent)] rounded-full font-semibold">
                      Owner
                    </span>
                  </div>
                  <span>Joined {formatDate(member.joinedAt)}</span>
                </div>
              </Surface>
            ))}
          </div>
        </div>

        {/* Team Members Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">Team Members ({membersList.filter(m => m.role !== 'owner').length})</h3>
            <div className="h-px flex-1 bg-[var(--line)] opacity-50" />
          </div>
          
          {membersList.filter(m => m.role !== 'owner').length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {membersList.filter(m => m.role !== 'owner').map((member) => (
                <Surface key={member.uid} className="p-5 flex flex-col gap-3 hover:translate-y-[-2px] transition-transform duration-200">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 flex-shrink-0 bg-[var(--surface-strong)] rounded-full flex items-center justify-center text-[var(--foreground)] font-semibold text-lg">
                      {member.displayName ? member.displayName[0].toUpperCase() : member.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[var(--foreground)] truncate">
                          {member.displayName || "Unknown User"}
                        </h4>
                        {member.uid === user?.uid && (
                          <span className="text-[10px] font-bold bg-[var(--muted)] text-[var(--foreground)] px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-70">You</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--line)] pt-3">
                    <span className="capitalize px-2 py-1 bg-[var(--surface-strong)] rounded-full font-medium">
                      {member.role}
                    </span>
                    <span>Joined {formatDate(member.joinedAt)}</span>
                  </div>
                </Surface>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)] italic py-4">No team members assigned to this workspace yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
