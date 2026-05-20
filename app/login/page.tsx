"use client"

import { signIn, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Icons } from "@/components/Icons"

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If user is already authenticated, redirect to the dashboard
    if (status === "authenticated") {
      router.replace("/")
    }
  }, [status, router])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      // Directs to NextAuth sign-in with Google, requesting access tokens
      await signIn("google", { callbackUrl: "/" })
    } catch (error) {
      console.error("Sign-in failure:", error)
      setLoading(false)
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Icons.Spinner size={32} className="text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-zinc-400">Verifying session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Background Gradient Blurs */}
      <div className="pointer-events-none absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-3xl" />

      {/* Decorative center mesh grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md scale-95 animate-scale-in">
        {/* Glow behind the card */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl transition duration-1000 group-hover:opacity-40" />
        
        {/* Card Frame */}
        <div className="relative rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="flex flex-col items-center text-center">
            {/* Branding Logo */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/10 ring-1 ring-white/10">
              <Icons.Campaign size={28} className="text-white" />
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Outreach Tracker
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Premium CRM & Intelligence Platform
            </p>

            <p className="mt-4 text-xs text-zinc-500 leading-relaxed max-w-xs">
              Synchronize contacts, configure conversion funnels, and manage campaign pipelines with complete automation.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-zinc-900 hover:border-zinc-700 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <Icons.Spinner size={18} className="text-indigo-400" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.554 0 2.973.562 4.076 1.489l3.056-3.056C19.262 2.766 15.986 1.5 12.24 1.5c-5.79 0-10.5 4.71-10.5 10.5s4.71 10.5 10.5 10.5c5.385 0 9.873-3.87 9.873-10.5 0-.585-.054-1.157-.156-1.715H12.24z"
                  />
                </svg>
              )}
              {loading ? "Connecting to OAuth..." : "Sign in with Google"}
            </button>

            <div className="relative flex items-center justify-center">
              <span className="absolute h-[1px] w-full bg-zinc-800" />
              <span className="relative bg-zinc-900/60 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Required Scopes
              </span>
            </div>

            {/* List permissions clearly */}
            <div className="rounded-2xl bg-zinc-950/80 p-4 border border-zinc-800/40 space-y-2.5">
              <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-zinc-400">
                <div className="mt-0.5 rounded bg-indigo-500/10 p-0.5 text-indigo-400">
                  <Icons.Mail size={12} />
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block">Gmail Read Access</span>
                  Fetch incoming replies and trigger intelligent workflow responses automatically.
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-zinc-400">
                <div className="mt-0.5 rounded bg-emerald-500/10 p-0.5 text-emerald-400">
                  <Icons.Check size={12} />
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block">Google Sheets Sync</span>
                  Export and synchronize conversion funnels with external client spreadsheets in real time.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <span className="text-[10px] font-semibold tracking-wide text-zinc-600 uppercase">
              Secure JWT Session Authentication
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
