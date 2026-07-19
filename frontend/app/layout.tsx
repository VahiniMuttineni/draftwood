import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "DraftBoard — Enterprise Document Approval & Workflow",
  description: "DraftBoard is an enterprise workflow platform for controlled document approvals, immutable audit history, and role-based governance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
