"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { Icons } from "@/components/Icons"
import { checkConnection, getContacts, Contact } from "@/lib/dataService"

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  "Awaiting Response": { label: "Awaiting Response", bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
  "Replied": { label: "Replied", bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  "Active Conversation": { label: "Active Conversation", bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  "FollowUp Pending": { label: "FollowUp Pending", bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20" },
  "No Response": { label: "No Response", bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20" },
  "Follow Up Pending": { label: "Follow Up Pending", bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20" }
}

export default function ContactsDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Data State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [dbState, setDbState] = useState<{ connected: boolean; source: "supabase" | "sandbox" }>({
    connected: false,
    source: "sandbox"
  })

  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Filters State
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  // Fetch data
  const loadData = async () => {
    try {
      const conn = await checkConnection()
      setDbState(conn)
      const data = await getContacts()
      setContacts(data)
    } catch (err) {
      console.error("Error loading contacts dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadData()
    }
  }, [status])

  // Sync contacts handler
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      // Direct POST to sync route
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
      const result = await res.json()

      if (res.ok && result.success) {
        alert("Gmail Synchronization Successful!")
        await loadData()
      } else {
        throw new Error(result.error || "Failed to synchronize Gmail threads.")
      }
    } catch (err: any) {
      console.warn("API Sync failed, running Sandbox Sync Simulator fallback:", err.message)
      
      // Sandbox local storage simulator fallback if offline/offline DB
      if (!dbState.connected) {
        alert("Running Offline Sync Simulation in Sandbox mode!")
        
        // Let's modify contact states in localStorage to simulate replies/updates
        const currentContacts = [...contacts]
        const updatedContacts = currentContacts.map(c => {
          if (c.email === "elon@spacex.com") {
            return {
              ...c,
              status: "Active Conversation" as any,
              replied: true,
              last_reply: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
          if (c.status === "Awaiting Response" && Math.random() > 0.5) {
            return {
              ...c,
              status: "Replied" as any,
              replied: true,
              last_reply: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
          return c
        })

        localStorage.setItem("ot_contacts", JSON.stringify(updatedContacts))
        setContacts(updatedContacts)
        alert("Sandbox Sync Successful! Simulated contact status updates stored in local memory.")
      } else {
        alert(`Synchronization Error: ${err.message}`)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter logic
  const filteredContacts = contacts.filter(c => {
    const nameMatch = c.name?.toLowerCase().includes(search.toLowerCase()) || false
    const orgMatch = c.organization?.toLowerCase().includes(search.toLowerCase()) || false
    const emailMatch = c.email.toLowerCase().includes(search.toLowerCase())
    const matchesSearch = nameMatch || orgMatch || emailMatch

    if (statusFilter === "all") return matchesSearch
    
    // Match correct status badges group mapping
    if (statusFilter === "Awaiting Response") return matchesSearch && (c.status as string) === "Awaiting Response"
    if (statusFilter === "Replied") return matchesSearch && ((c.status as string) === "Replied" || (c.status as string) === "Active Conversation")
    if (statusFilter === "FollowUp Pending") return matchesSearch && ((c.status as string) === "FollowUp Pending" || (c.status as string) === "No Response" || (c.status as string) === "Follow Up Pending")
    
    return matchesSearch
  })

  // Sign out handler
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  if (status === "loading" || status === "unauthenticated" || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Icons.Spinner size={32} className="text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-zinc-400">Loading contacts dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md">
                <Icons.Campaign size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
                  Outreach Tracker
                </h1>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Sync & Contacts Dashboard
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex pl-4 border-l border-zinc-800">
              <Link
                href="/"
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
              >
                CRM Pipeline
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-zinc-900 transition-all border border-zinc-800"
              >
                Gmail Sync
              </Link>
            </nav>
          </div>

          {/* Right Section Profile */}
          <div className="flex items-center gap-4">
            {/* Database indicator */}
            <div className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider sm:flex ring-1 ring-inset ${
              dbState.connected
                ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
            }`}>
              <Icons.DbConnected size={11} className={dbState.connected ? "" : "animate-pulse"} />
              {dbState.source === "supabase" ? "Supabase Cloud" : "Local Sandbox"}
            </div>

            <div className="h-6 w-[1px] bg-zinc-800 hidden sm:block" />

            {/* Profile info */}
            <div className="flex items-center gap-3">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User Avatar"}
                  width={34}
                  height={34}
                  className="rounded-full ring-2 ring-indigo-500/20"
                />
              ) : (
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white shadow-md">
                  {session?.user?.name ? session.user.name[0] : "U"}
                </div>
              )}
              <div className="hidden flex-col text-left md:flex">
                <span className="text-xs font-semibold text-zinc-200">
                  {session?.user?.name || "Outreach User"}
                </span>
                <span className="text-[9px] text-zinc-500 font-medium">
                  {session?.user?.email}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-2 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <Icons.LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 flex flex-col gap-8 relative">
        {/* Sandbox setup notice */}
        {!dbState.connected && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm animate-slide-in">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                <Icons.DbConnected size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 text-xs sm:text-sm">
                <h4 className="font-bold text-amber-300">Sandbox Mode Active</h4>
                <p className="mt-1 text-zinc-400 leading-relaxed">
                  Your contacts dashboard is running in Sandbox mode. Trigger a manual sync simulation using the **Sync Now** button to test Gmail inbox query routines and watch simulated conversion statuses update in browser memory.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PAGE DESCRIPTIONS BOARD */}
        <section className="flex flex-col gap-2 border-b border-zinc-900 pb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">Gmail Contacts Sync</h2>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Monitor communication threads, automate sent messages retrieval, and parse inbound responses in real time. Sync logs show direct thread connections verified by your Google Workspace OAuth scope.
          </p>
        </section>

        {/* CONTROL AND FILTER TOOLBAR */}
        <section className="flex flex-col gap-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative w-full max-w-xs sm:w-60">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
                <Icons.Search size={16} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, org..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-600 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filter stages */}
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all ${
                  statusFilter === "all"
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                    : "bg-zinc-950/20 text-zinc-400 border-zinc-800/80 hover:bg-zinc-900"
                }`}
              >
                All Stages
              </button>
              <button
                onClick={() => setStatusFilter("Awaiting Response")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                  statusFilter === "Awaiting Response"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 ring-1 ring-amber-500/20"
                    : "bg-zinc-950/20 text-zinc-500 border-zinc-800/80 hover:bg-zinc-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Awaiting
              </button>
              <button
                onClick={() => setStatusFilter("Replied")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                  statusFilter === "Replied"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ring-1 ring-emerald-500/20"
                    : "bg-zinc-950/20 text-zinc-500 border-zinc-800/80 hover:bg-zinc-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Replied
              </button>
              <button
                onClick={() => setStatusFilter("FollowUp Pending")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                  statusFilter === "FollowUp Pending"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20 ring-1 ring-rose-500/20"
                    : "bg-zinc-950/20 text-zinc-500 border-zinc-800/80 hover:bg-zinc-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                No Response
              </button>
            </div>
          </div>

          {/* Sync Button Action */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition-all hover:bg-indigo-500 hover:-translate-y-0.5 disabled:opacity-50 disabled:-translate-y-0 cursor-pointer"
          >
            {isSyncing ? (
              <Icons.Spinner size={14} className="text-white animate-spin" />
            ) : (
              <Icons.Mail size={14} className="text-white" />
            )}
            {isSyncing ? "Synchronizing Inbox..." : "Sync Now"}
          </button>
        </section>

        {/* LOADING & TABLE VIEWS */}
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md shadow-xl flex flex-col min-h-[400px]">
          {isSyncing && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Icons.Spinner size={36} className="text-indigo-500 animate-spin" />
                <p className="text-sm font-semibold tracking-wider text-zinc-200">Querying Gmail REST labels...</p>
                <p className="text-xs text-zinc-500">Checking thread responses and matching outreach contacts</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Organization</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Last Contacted</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Replied</th>
                  <th className="pb-3">Last Reply</th>
                  <th className="pb-3 text-right pr-2">Thread Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-xs">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-zinc-500 font-semibold border border-dashed border-zinc-800/60 rounded-2xl bg-zinc-950/20">
                      No outreach sync records loaded in workspace.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((c) => {
                    // Grab formatted color badge values
                    const badge = STATUS_BADGES[c.status] || {
                      label: c.status,
                      bg: "bg-zinc-500/10",
                      text: "text-zinc-400",
                      ring: "ring-zinc-500/20"
                    }

                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/20 transition-all duration-150">
                        {/* Name and avatar */}
                        <td className="py-4 pl-2 font-bold text-zinc-100">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-zinc-950 text-indigo-400 font-extrabold border border-zinc-800/80 shadow-inner">
                              {c.name ? c.name[0] : "P"}
                            </div>
                            <span>{c.name || "Anonymous Contact"}</span>
                          </div>
                        </td>

                        {/* Org */}
                        <td className="py-4 font-semibold text-zinc-400">
                          {c.organization || "No Organization"}
                        </td>

                        {/* Email */}
                        <td className="py-4 font-mono text-[11px] text-zinc-500">
                          {c.email}
                        </td>

                        {/* Last Contacted */}
                        <td className="py-4 text-zinc-400 font-medium">
                          {new Date(c.last_contacted).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>

                        {/* Status badge */}
                        <td className="py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Replied state */}
                        <td className="py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
                            c.replied
                              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-500 ring-1 ring-zinc-500/20"
                          }`}>
                            {c.replied ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Last Reply */}
                        <td className="py-4 text-zinc-400 font-medium">
                          {c.last_reply ? (
                            new Date(c.last_reply).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Thread Link */}
                        <td className="py-4 text-right pr-2">
                          {c.thread_id ? (
                            <a
                              href={`https://mail.google.com/mail/u/0/#all/${c.thread_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900 transition-all hover:-translate-y-0.5"
                            >
                              <Icons.Mail size={11} className="text-indigo-400" />
                              View Thread
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-600 font-medium">No Thread Link</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Outreach Tracker Contacts CRM © {new Date().getFullYear()} — Secure OAuth Google & Supabase Integration
      </footer>
    </div>
  )
}
