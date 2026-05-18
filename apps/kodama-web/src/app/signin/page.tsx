import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { authOptions } from "@/lib/auth";

function FlowerMark() {
  return (
    <svg viewBox="0 0 32 32" width={26} height={26} aria-hidden>
      <defs>
        <radialGradient id="signin-petal" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="60%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e26a1f" />
        </radialGradient>
      </defs>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="9"
          rx="4.2"
          ry="6.4"
          fill="url(#signin-petal)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="#fff3df" />
      <circle cx="16" cy="16" r="1.6" fill="#f97316" />
    </svg>
  );
}

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fdf6ec] via-[#fbeed5] to-[#f5e2bc]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,196,142,0.55),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,217,168,0.6),transparent)]"
      />

      <Link
        href="/"
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-[#1a2a4a]/12 bg-white/70 px-4 py-2 text-sm font-medium text-[#1a2a4a] shadow-sm backdrop-blur transition hover:bg-white/90"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </Link>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-10">
        <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/60 bg-white/55 shadow-[0_40px_120px_-30px_rgba(20,40,80,0.35)] backdrop-blur-xl lg:h-[84vh] lg:min-h-[640px]">
          <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden overflow-hidden lg:block">
              <Image
                src="/login.png"
                alt="Kodama mascot waving hello"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 0vw"
                className="object-cover object-center"
              />

              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#fdf3e0]/85 via-[#fdf3e0]/40 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#1a2a4a]/55 via-[#1a2a4a]/15 to-transparent"
              />

              <div className="absolute left-8 top-8 z-10 flex items-center gap-2 text-[#1a2a4a]">
                <FlowerMark />
                <span className="font-serif text-2xl tracking-tight">
                  Kodama
                </span>
              </div>

              <div className="absolute inset-x-8 bottom-8 z-10">
                <p className="font-serif text-2xl leading-snug tracking-tight text-white drop-shadow-[0_2px_10px_rgba(20,40,80,0.45)]">
                  Quiet ops for every{" "}
                  <em className="italic text-[#ffd9a8]">agent</em> you ship.
                </p>
                <p className="mt-2 text-sm text-white/85 drop-shadow-[0_1px_6px_rgba(20,40,80,0.45)]">
                  One dashboard for every project, every operator, every model.
                </p>
              </div>
            </aside>

            <section className="relative flex items-center justify-center bg-gradient-to-b from-white/85 to-[#fdf6ec]/85 p-8 sm:p-12">
              <div className="w-full max-w-sm space-y-8">
                <div className="flex items-center gap-2 lg:hidden">
                  <FlowerMark />
                  <span className="font-serif text-2xl tracking-tight text-[#1a2a4a]">
                    Kodama
                  </span>
                </div>

                <div className="space-y-3 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#1a2a4a]/10 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#b46a2a] backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a2e]" />
                    Welcome back
                  </div>
                  <h1 className="font-serif text-4xl leading-tight tracking-tight text-[#1a2a4a] sm:text-5xl">
                    Sign in to <em className="italic text-[#b46a2a]">Kodama</em>
                  </h1>
                  <p className="text-[15px] leading-relaxed text-[#3a4a6a]/85">
                    Continue with Google to access your projects, operators, and
                    models.
                  </p>
                </div>

                <div className="space-y-4">
                  <GoogleSignInButton />
                </div>

                <p className="text-center text-xs leading-relaxed text-[#3a4a6a]/75 lg:text-left">
                  By continuing, you agree to the Kodama{" "}
                  <Link
                    href="/terms"
                    className="text-[#b46a2a] underline-offset-2 hover:underline"
                  >
                    terms
                  </Link>{" "}
                  and acknowledge our{" "}
                  <Link
                    href="/privacy"
                    className="text-[#b46a2a] underline-offset-2 hover:underline"
                  >
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
