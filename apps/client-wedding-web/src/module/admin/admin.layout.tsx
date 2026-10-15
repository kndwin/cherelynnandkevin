import { createContext, useCallback, useContext, useEffect, useState, type ComponentProps } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { AdminApiError, adminLogin, adminLogout, adminSession } from "./admin.api.ts";
import { AdminLoginView } from "./admin.ui.tsx";

const SessionContext = createContext<(message: string) => void>(() => {});
export const useAdminSession = () => useContext(SessionContext);

export function AdminLayout() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const expireSession = useCallback((reason: string) => {
    setAuthenticated(false);
    setMessage(reason);
  }, []);

  useEffect(() => {
    let active = true;
    void adminSession().then(() => {
      if (active) setAuthenticated(true);
    }).catch((error: unknown) => {
      if (active && !(error instanceof AdminApiError && error.status === 401)) {
        setMessage(error instanceof Error ? error.message : "Could not check admin session.");
      }
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const login: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    void adminLogin(password).then(() => {
      setPassword("");
      setAuthenticated(true);
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    }).finally(() => setSubmitting(false));
  };

  const logout = () => {
    setSubmitting(true);
    void adminLogout().then(() => {
      setAuthenticated(false);
      setMessage(null);
      toast.success("Logged out");
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not log out.");
    }).finally(() => setSubmitting(false));
  };

  if (checking) return <main className="grid min-h-screen place-items-center bg-background text-foreground"><p role="status" className="text-sm">Loading admin…</p></main>;
  if (!authenticated) return <AdminLoginView isError={message !== null} isSubmitting={submitting} message={message} onFormSubmit={login} onPasswordChange={setPassword} password={password} />;

  return <SessionContext.Provider value={expireSession}>
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-4">
      <div className="mx-auto grid max-w-[1800px] gap-4">
        <header className="flex flex-wrap items-center gap-4">
          <span className="font-serif text-xl">Admin</span>
          <nav aria-label="Admin navigation" className="flex items-center gap-1 text-xs">
            <Link to="/admin/guests" className="rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-muted font-semibold" }}>Guests</Link>
            <Link to="/admin/operations" className="rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-muted font-semibold" }}>Operations</Link>
            <Link to="/admin/syncs" className="rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-muted font-semibold" }}>Syncs</Link>
          </nav>
          <Button className="ml-auto h-8 rounded-md px-2 text-xs normal-case tracking-normal" variant="outline" disabled={submitting} onClick={logout}>Log out</Button>
        </header>
        <Outlet />
      </div>
    </main>
  </SessionContext.Provider>;
}
