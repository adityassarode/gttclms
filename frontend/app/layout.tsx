import "./globals.css";
import * as React from "react";
import { AuthProvider } from "@/lib/auth-context";
import { BackgroundCustomizer } from "@/components/background-customizer";
import { Toaster } from "sonner";

export const metadata = {
  title: "GTTC LMS",
  description: "Library management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <BackgroundCustomizer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
