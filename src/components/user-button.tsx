\"use client\";

import { useState, useRef, useEffect } from \"react\";
import { useWorkHub } from \"@/lib/work-hub-store\";
import { motion, AnimatePresence } from \"framer-motion\";
import Link from \"next/link\";
import { 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  Settings,
  ShieldCheck,
  AlertCircle,
  X
} from \"lucide-react\";

export function UserButton() {
  const { user, signIn, signOut, isSyncing, authError, clearAuthError, isAuthenticating } = useWorkHub();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener(\"mousedown\", handleClickOutside);
    return () => document.removeEventListener(\"mousedown\", handleClickOutside);
  }, []);

  const formatAuthError = (error: string | null) => {
    if (!error) return null;
    if (error.includes(\"auth/popup-blocked\")) {
      return \"The sign-in popup was blocked. Redirecting you to sign-in instead...\";
    }
    if (error.includes(\"auth/network-request-failed\")) {
      return \"Network error. Please check your internet connection.\";
    }
    if (error.includes(\"auth/internal-error\")) {
      return \"An internal authentication error occurred. Please try again later.\";
    }
    return error;
  };

  if (!user) {
    const displayError = formatAuthError(authError);

    return (
      <div className=\"relative flex flex-col items-end gap-2\">
        <button
          onClick={() => signIn()}
          disabled={isAuthenticating}
          className=\"flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm active:scale-95\"
        >
          {isAuthenticating ? (
            <RefreshCw className=\"w-4 h-4 animate-spin\" />
          ) : (
            <LogIn className=\"w-4 h-4\" />
          )}
          <span>{isAuthenticating ? \"Signing in...\" : \"Sign In\"}</span>
        </button>
 
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className=\"absolute top-full mt-2 right-0 w-64 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs shadow-lg z-50 flex gap-2 items-start\"
            >
              <AlertCircle className=\"w-4 h-4 shrink-0 mt-0.5\" />
              <div className=\"flex-1\">
                <p className=\"font-bold mb-1\">Sign-in Error</p>
                <p className=\"opacity-90 leading-relaxed\">{displayError}</p>
                <button 
                  onClick={clearAuthError}
                  className=\"mt-2 text-[10px] underline font-bold uppercase tracking-wider hover:opacity-75 transition-opacity\"
                >
                  Dismiss
                </button>
              </div>
              <button 
                onClick={clearAuthError}
                className=\"p-1 hover:bg-destructive/10 rounded-full transition-colors\"
                aria-label=\"Dismiss auth error notification\"
              >
                <X className=\"w-3 h-3\" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className=\"relative\" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all border border-[var(--line)] shadow-sm active:scale-95 ${
          isOpen ? \"bg-[var(--surface-strong)]\" : \"bg-[var(--surface)] hover:bg-[var(--surface-strong)]\"
        }`}
      >
        <div className=\"w-8 h-8 rounded-full overflow-hidden bg-[var(--accent-soft)] flex items-center justify-center border border-[var(--line)]\">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || \"User\"} className=\"w-full h-full object-cover\" />
          ) : (
            <UserIcon className=\"w-4 h-4 text-[var(--accent)]\" />
          )}
        </div>
        <div className=\"flex flex-col items-start leading-none pr-1\">
          <span className=\"text-sm font-semibold text-[var(--foreground)]\">
            {user.displayName || \"User\"}
          </span>
          <div className=\"flex items-center gap-1 mt-0.5\">
            {isSyncing ? (
              <RefreshCw className=\"w-2.5 h-2.5 text-primary animate-spin\" />
            ) : (
              <Cloud className=\"w-2.5 h-2.5 text-success\" />
            )}
            <span className=\"text-[10px] text-muted-foreground uppercase tracking-wider font-bold\">
              {isSyncing ? \"Syncing\" : \"Synced\"}
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className=\"absolute right-0 top-full mt-2 w-64 rounded-2xl bg-background border border-border shadow-xl z-50 overflow-hidden\"
          >
            <div className=\"p-4 border-b border-border bg-muted/30\">
              <div className=\"flex items-center gap-3\">
                <div className=\"w-10 h-10 rounded-full overflow-hidden border border-border shadow-sm\">
                  {user.photoURL && <img src={user.photoURL} alt=\"\" className=\"w-full h-full\" />}
                </div>
                <div className=\"flex flex-col\">
                  <span className=\"text-sm font-bold\">{user.displayName}</span>
                  <span className=\"text-xs text-muted-foreground truncate max-w-[180px]\">{user.email}</span>
                </div>
              </div>
            </div>

            <div className=\"p-2\">
              <div className=\"flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1\">
                Workspace
              </div>
              <div className=\"flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors group cursor-default\">
                <div className=\"flex items-center gap-3\">
                  <Cloud className=\"w-4 h-4 text-primary\" />
                  <span className=\"text-sm\">Real-time Sync</span>
                </div>
                <div className=\"w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]\" />
              </div>
              
              <div className=\"h-px bg-border my-2 mx-2\" />
              
              <Link 
                href=\"/settings\"
                onClick={() => setIsOpen(false)}
                className=\"w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-all text-left cursor-pointer active:scale-[0.98]\"
              >
                <Settings className=\"w-4 h-4 text-muted-foreground\" />
                <span className=\"text-sm font-medium\">Account Settings</span>
              </Link>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className=\"w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-all text-left mt-1 cursor-pointer active:scale-[0.98]\"
              >
                <LogOut className=\"w-4 h-4\" />
                <span className=\"text-sm font-medium\">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
