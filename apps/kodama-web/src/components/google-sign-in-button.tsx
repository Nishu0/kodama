"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons";

export function GoogleSignInButton({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
      className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-[#1a2a4a]/12 bg-white px-5 py-3.5 text-[15px] font-semibold text-[#1a2a4a] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_10px_30px_-12px_rgba(20,40,80,0.25)] transition hover:-translate-y-0.5 hover:border-[#1a2a4a]/20 hover:shadow-[0_14px_36px_-12px_rgba(20,40,80,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="flex h-6 w-6 items-center justify-center">
        {loading ? (
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            className="animate-spin text-[#b46a2a]"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="44"
              strokeDashoffset="32"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <GoogleIcon width={20} height={20} />
        )}
      </span>
      {loading ? "Redirecting to Google" : "Continue with Google"}
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-1 text-[#1a2a4a]/40 transition group-hover:translate-x-0.5 group-hover:text-[#1a2a4a]/70"
        aria-hidden
      >
        <path d="M5 12h14" />
        <path d="m13 5 7 7-7 7" />
      </svg>
    </button>
  );
}
