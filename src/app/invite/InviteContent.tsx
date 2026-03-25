"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useWorkHub } from "@/lib/work-hub-store";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { UserIcon } from "@/components/icons";

export default function InvitePageClient({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  
  const { user, signIn, initialized } = useWorkHub();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!initialized || !user || !inviteId) {
      if (initialized && !user) setLoading(false);
      return;
    }

    const processInvite = async () => {
      try {
        const inviteRef = doc(db, "invites", inviteId);
        const inviteSnap = await getDoc(inviteRef);

        if (!inviteSnap.exists()) {
          setError("This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }

        const inviteData = inviteSnap.data();
        if (inviteData.status !== "active") {
          setError("This invite link is no longer active.");
          setLoading(false);
          return;
        }

        const workspaceId = inviteData.workspaceId;
        setJoining(true);

        // 1. Add user to the workspace members
        const wsRef = doc(db, "workspaces", workspaceId);
        await updateDoc(wsRef, {
          [`members.${user.uid}`]: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: "assignee",
            joinedAt: new Date().toISOString(),
          }
        });

        // 2. Update user's current workspace
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          currentWorkspaceId: workspaceId,
          workspaceIds: arrayUnion(workspaceId)
        });

        // 3. Success! Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        console.error("Invite processing error:", err);
        setError("Failed to join workspace. You might already be a member or the link is restricted.");
      } finally {
        setJoining(false);
        setLoading(false);
      }
    };

    processInvite();
  }, [initialized, user, inviteId, router]);

  if (loading && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)] animate-pulse">
          {joining ? "Joining workspace..." : "Verifying invite..."}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
        <Surface className="max-w-md w-full p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <UserIcon className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Invite Error</h1>
            <p className="text-sm text-[var(--muted)]">{error}</p>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </Surface>
      </div>
    );
  }

  if (!user && initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
        <Surface className="max-w-md w-full p-8 text-center space-y-6">
          <div className="h-16 w-16 bg-[var(--surface-strong)] text-[var(--foreground)] rounded-full flex items-center justify-center mx-auto">
            <UserIcon className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Workspace Invitation</h1>
            <p className="text-sm text-[var(--muted)]">
              You've been invited to join a workspace. Please sign in to accept the invitation.
            </p>
          </div>
          <Button onClick={signIn} className="w-full">
            Sign in to Continue
          </Button>
        </Surface>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
       <div className="text-[var(--muted)]">Redirecting...</div>
    </div>
  );
}
