"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/session";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, Sun, Shield } from "lucide-react";

export default function Settings() {
  const { user, logout } = useSession();
  const [activeTab, setActiveTab] = useState("Profile");
  const [theme, setTheme] = useState("system");
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "system";
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };
  
  if (!user) return null;

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">Settings</h1>
        <p className="mt-2 text-sm text-body">Manage your profile, notification preferences, and security posture.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1 text-sm">
          {["Profile", "Appearance", "Security"].map((s) => (
            <button 
              key={s} 
              onClick={() => setActiveTab(s)}
              className={`block w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTab === s 
                  ? "bg-primary/10 font-semibold text-primary shadow-sm" 
                  : "text-body hover:bg-muted hover:text-heading hover:pl-4"
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {activeTab === "Profile" && (
            <Card className="border-border bg-card p-6 shadow-panel animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-base font-semibold text-heading">Profile</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Visible to teammates across your organization. Your profile information is managed by your organization's IT directory.</p>
              <div className="mt-6 flex items-center gap-5">
                <div className="grid h-16 w-16 place-items-center rounded-full text-white text-lg font-semibold bg-primary">
                  {user.name.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div className="text-lg font-semibold text-heading">{user.name}</div>
                  <div className="text-sm text-body">{user.role}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Full name" defaultValue={user.name} />
                <Field label="Email" defaultValue={user.email} />
                <Field label="Department" defaultValue="Executive" />
                <Field label="Role" defaultValue={user.role} />
              </div>
            </Card>
          )}

          {activeTab === "Appearance" && (
            <Card className="border-border bg-card p-6 shadow-panel animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-base font-semibold text-heading">Appearance</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Customize how ExecutiveFlow looks on your device.</p>
              
              <div className="mt-6">
                <div className="mb-3 text-sm font-medium text-heading">Theme preference</div>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => handleThemeChange("light")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${theme === "light" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-heading"}`}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-xs font-medium">Light</span>
                  </button>
                  <button 
                    onClick={() => handleThemeChange("dark")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${theme === "dark" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-heading"}`}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-xs font-medium">Dark</span>
                  </button>
                  <button 
                    onClick={() => handleThemeChange("system")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${theme === "system" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground hover:text-heading"}`}
                  >
                    <Monitor className="h-6 w-6" />
                    <span className="text-xs font-medium">System</span>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "Security" && (
            <Card className="border-border bg-card p-6 shadow-panel animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-base font-semibold text-heading">Security</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Manage your session and access credentials.</p>
              
              <div className="mt-6 border rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-heading">Active Session</div>
                      <div className="mt-1 text-xs text-muted-foreground">You are currently signed in as {user.email}.</div>
                      <div className="mt-1 text-xs text-muted-foreground">Role: {user.role}</div>
                    </div>
                  </div>
                  <Button onClick={handleLogout} variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-body">{label}</div>
      <input readOnly defaultValue={defaultValue} className="h-9 w-full rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground cursor-default focus:outline-none" />
    </label>
  );
}
