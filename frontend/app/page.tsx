"use client";

import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/types";
import { useSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles, Lock, Check } from "lucide-react";
import { ShaderGradient } from "@/components/ShaderGradient";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as any, stiffness: 300, damping: 24 },
  },
};

export default function LoginPage() {
  const { user, login } = useSession();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !selectedId) router.push("/dashboard");
  }, [user, router, selectedId]);

  const handlePick = (id: string) => {
    setSelectedId(id);
    setTimeout(async () => {
      try {
        await login(id);
        router.push("/dashboard");
      } catch (err) {
        console.error("Login failed", err);
        setSelectedId(null);
      }
    }, 800);
  };

  return (
    <div className="min-h-dvh bg-background relative overflow-hidden">
      <ShaderGradient />
      
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-8 py-6"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar text-white text-sm font-bold">DW</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-heading">Draftwood</div>
            <div className="text-[11px] text-muted-foreground">Enterprise Workflow Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="hidden items-center gap-1.5 md:inline-flex"><ShieldCheck className="h-3.5 w-3.5" /> SOC 2 Type II</span>
          <span className="hidden items-center gap-1.5 md:inline-flex"><Lock className="h-3.5 w-3.5" /> SSO ready</span>
        </div>
      </motion.header>

      <main className="relative z-10 mx-auto grid max-w-[1440px] gap-16 px-8 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:items-center">
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 backdrop-blur-sm px-3 py-1 text-xs text-body shadow-sm">
            <Sparkles className="h-3 w-3 text-primary" /> Trusted by governance teams at Fortune 500 organizations
          </motion.div>
          <motion.h1 variants={itemVariants} className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-heading md:text-6xl">
            Controlled document<br />workflows, at enterprise scale.
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-6 max-w-lg text-base leading-relaxed text-body">
            Draftwood moves documents through a strict Draft → Submitted → Approved → Published lifecycle
            with role-based permissions, optimistic concurrency protection, and an immutable audit trail — so nothing is ever bypassed, and every action is traceable.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { k: "99.99%", v: "Audit trail integrity" },
              { k: "4-stage", v: "Approval lifecycle" },
              { k: "Zero", v: "Silent overwrites" },
            ].map((s) => (
              <div key={s.k} className="border-l border-border/60 pl-4">
                <div className="text-2xl font-semibold tracking-tight text-heading">{s.k}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 shadow-elevated"
        >
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Demo access</div>
          <h2 className="text-xl font-semibold text-heading">Continue as</h2>
          <p className="mt-1 text-sm text-body">Select an identity to preview the role-adaptive experience.</p>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6 grid gap-3 sm:grid-cols-2"
          >
            {DEMO_USERS.map((u) => {
              const isSelected = selectedId === u.email;
              const isOtherSelected = selectedId !== null && !isSelected;

              return (
                <motion.button
                  key={u.email}
                  variants={itemVariants}
                  whileHover={!selectedId ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!selectedId ? { scale: 0.98 } : {}}
                  onClick={() => !selectedId && handlePick(u.email)}
                  animate={
                    isSelected 
                      ? { scale: 1.05, opacity: 1, zIndex: 10, borderColor: "var(--color-primary)" }
                      : isOtherSelected 
                        ? { scale: 0.95, opacity: 0.4, filter: "grayscale(100%)" }
                        : { scale: 1, opacity: 1 }
                  }
                  disabled={selectedId !== null}
                  className={`group relative flex w-full flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all shadow-sm ${
                    isSelected ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <motion.div
                      layout
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white text-sm font-semibold relative overflow-hidden"
                      style={{ background: u.avatarColor }}
                    >
                      <AnimatePresence mode="popLayout">
                        {isSelected ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring" as any, bounce: 0.5 }}
                          >
                            <Check className="h-5 w-5 text-white" strokeWidth={3} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="initials"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            {u.initials}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    
                    {!isSelected && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:-translate-x-1 group-hover:opacity-100" />
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold text-heading">{u.name}</div>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-body">{u.role}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          <p className="mt-6 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            Session-scoped demo. In production, Draftwood uses your organization's SSO provider with SAML 2.0 or OIDC and enforces MFA per your security policy.
          </p>
        </motion.section>
      </main>
    </div>
  );
}
