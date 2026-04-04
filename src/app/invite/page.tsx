"use client";

import InviteContent from "./InviteContent";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [isMissingId, setIsMissingId] = useState(false);

  useEffect(() => {
    // Extract inviteId from URL path since this is a static route handling dynamic paths via rewrites.
    // Example: /invite/invite-123 -> inviteId is 'invite-123'
    const pathParts = window.location.pathname.split('/');
    const id = pathParts.pop() || pathParts.pop(); // pop once or twice depending on trailing slash
    if (id && id !== 'invite') {
      setInviteId(id);
    } else {
      setIsMissingId(true);
    }
  }, []);

  if (isMissingId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[var(--background)]">
        <div className="text-center space-y-4 max-w-md w-full">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Missing Invite Link</h1>
          <p className="text-sm text-[var(--muted)]">Please use a valid workspace invite link to join.</p>
          <button onClick={() => window.location.href = '/dashboard'} className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] w-full">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
