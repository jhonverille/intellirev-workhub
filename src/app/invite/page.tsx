"use client";

import InviteContent from "./InviteContent";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const [inviteId, setInviteId] = useState<string | null>(null);

  useEffect(() => {
    // Extract inviteId from URL path since this is a static route handling dynamic paths via rewrites.
    // Example: /invite/invite-123 -> inviteId is 'invite-123'
    const pathParts = window.location.pathname.split('/');
    const id = pathParts.pop() || pathParts.pop(); // pop once or twice depending on trailing slash
    if (id && id !== 'invite') {
      setInviteId(id);
    }
  }, []);

  if (!inviteId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)] animate-pulse">
           Loading invite...
        </div>
      </div>
    );
  }

  return <InviteContent inviteId={inviteId} />;
}
