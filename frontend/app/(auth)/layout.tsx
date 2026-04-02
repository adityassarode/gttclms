import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-background">
      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl sm:h-[600px] sm:w-[600px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 h-[260px] w-[260px] rounded-full bg-accent/5 blur-3xl sm:h-[400px] sm:w-[400px]" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-center px-4 pb-2 pt-4 sm:p-6">
        <Link
          href="/"
          className="group inline-flex items-center justify-center"
        >
          <Image
            src="/api/assets/logo"
            alt="GTTC logo"
            width={220}
            height={220}
            className="mx-auto h-auto w-full max-w-[140px] transition-transform group-hover:scale-[1.02] sm:max-w-[180px] md:max-w-[220px]"
            priority
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8 pt-2 sm:p-6 md:items-center">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground sm:p-6 sm:text-sm">
        <p>
          &copy; {new Date().getFullYear()} GTTC Library. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
