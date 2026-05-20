"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"

import { Icons } from "@/components/Icons"
import DashboardStats from "@/components/DashboardStats"
import LeadTable from "@/components/LeadTable"
import InteractionLogger from "@/components/InteractionLogger"

import {
  checkConnection,
  getLeads,
  addLead,
  updateLeadStatus,
  deleteLead,
  getInteractions,
  addInteraction,
  Lead,
  Interaction
} from "@/lib/dataService"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // App state
  const [dbState, setDbState] = useState<{ connected: boolean; source: "supabase" | "sandbox" }>({
    connected: false,
    source: "sandbox"
  })
  const [leads, setLeads] = useState<Lead[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  
  // Selection state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  // Initial load
  useEffect(() => {
    if (status !== "authenticated") return

    async function loadData() {
      setLoading(true)
      try {
        const conn = await checkConnection()
        setDbState(conn)

        const allLeads = await getLeads()
        setLeads(allLeads)

        const allInts = await getInteractions()
        setInteractions(allInts)
      } catch (err) {
        console.error("Error loading data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [status])

  const handleAddLead = async (leadData: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const newLead = await addLead(leadData)
    setLeads((prev) => [newLead, ...prev])
  }

  const handleUpdateLeadStatus = async (leadId: string, newStatus: Lead["status"]) => {
    await updateLeadStatus(leadId, newStatus)
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l))
    )
  }

  const handleDeleteLead = async (leadId: string) => {
    await deleteLead(leadId)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setInteractions((prev) => prev.filter((i) => i.lead_id !== leadId))
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null)
    }
  }

  const handleSyncSheets = async (sheetId?: string) => {
    try {
      const res = await fetch("/api/sync-sheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheetId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to synchronize sheets data.")
      }

      alert(data.message || "Successfully synchronized sheet contacts!")

      // Re-fetch all leads and interactions to keep the UI perfectly synchronized
      const allLeads = await getLeads()
      setLeads(allLeads)
      const allInts = await getInteractions()
      setInteractions(allInts)
    } catch (err: any) {
      console.error(err)
      
      // Local sandbox fallback simulation if offline/development
      if (!dbState.connected) {
        alert("Running Sheets Sync simulation in Sandbox mode using LocalStorage!")
        
        // Simulating Google Sheets mock values sync into LocalStorage
        const mockSheetContacts = [
          { name: "Bill Gates", organization: "Gates Foundation", email: "bill@gatesfoundation.org", linkedinLink: "https://linkedin.com/in/williamhgates" },
          { name: "Elon Musk", organization: "SpaceX", email: "elon@spacex.com", linkedinLink: "https://linkedin.com/in/elonmusk" },
          { name: "Satya Nadella", organization: "Microsoft", email: "satya@microsoft.com", linkedinLink: "https://linkedin.com/in/satyanadella" }
        ]

        let sandboxLeads = [...leads]
        let added = 0
        
        for (const c of mockSheetContacts) {
          // Check if email already exists
          const exists = sandboxLeads.some(l => l.email === c.email)
          if (!exists) {
            const nameParts = c.name.split(" ")
            const newL: Lead = {
              id: Math.random().toString(36).substring(2),
              first_name: nameParts[0] || "Imported",
              last_name: nameParts.slice(1).join(" ") || "Prospect",
              email: c.email,
              company: c.organization,
              role: "Prospect",
              status: "prospect",
              linkedin_link: c.linkedinLink,
              notes: "Imported via Google Sheets Sandbox sync.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            sandboxLeads.unshift(newL)
            added++
          }
        }

        setLeads(sandboxLeads)
        localStorage.setItem("ot_leads", JSON.stringify(sandboxLeads))
        alert(`Sandbox import complete! Added ${added} new contacts as prospects into LocalStorage!`)
      } else {
        alert(`Google Sheets Sync Error: ${err.message}`)
      }
    }
  }

  const handleAddInteraction = async (
    leadId: string,
    type: Interaction["type"],
    notes: string,
    sentiment: Interaction["sentiment"]
  ) => {
    const newInt = await addInteraction(leadId, type, notes, sentiment)
    setInteractions((prev) => [newInt, ...prev])
    
    // Automatically progress the lead status on UI side as well
    let targetStatus: Lead["status"] = "contacted"
    if (type === "meeting") targetStatus = "replied"
    
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus, updated_at: new Date().toISOString() } : l))
    )
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null
  const selectedLeadInteractions = interactions.filter((i) => i.lead_id === selectedLeadId)

  // Filter leads and interactions based on active campaign selection for Dashboard Stats alignment
  const statsLeads = leads
  const statsInteractions = interactions

  // Sign out handler
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" })
  }

  if (status === "loading" || status === "unauthenticated" || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Icons.Spinner size={32} className="text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-zinc-400">Loading Outreach workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* TOP HEADER */}
      <header className="relative border-b border-zinc-800/80 bg-zinc-900/40 px-6 py-4 backdrop-blur-md shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md">
              <Icons.Campaign size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
                Outreach Tracker
              </h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                Workspace
              </p>
            </div>
          </div>

          {/* User profile & Sign Out */}
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
                  Your application is running beautifully using **LocalStorage**. Any changes (leads, interactions) will persist locally in your browser. To sync live with your Supabase Cloud, copy and execute the SQL tables schema inside the{" "}
                  <a href="file:///c:/Users/HP/.gemini/antigravity/scratch/outreach-tracker/lib/schema.sql" className="font-bold text-amber-400 underline hover:text-amber-300">
                    lib/schema.sql
                  </a>{" "}
                  file in your Supabase SQL editor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* METRICS STATS BOARD */}
        <section>
          <DashboardStats leads={statsLeads} interactions={statsInteractions} />
        </section>

        {/* ACTIVE WORKSPACE GRID */}
        <section className="flex-1 grid grid-cols-1 gap-8 lg:grid-cols-12 min-h-0">
          {/* Main panel - Leads Pipeline table (75% width) */}
          <div className="lg:col-span-9 flex flex-col min-h-[400px]">
            <LeadTable
              leads={leads}
              onAddLead={handleAddLead}
              onUpdateStatus={handleUpdateLeadStatus}
              onDeleteLead={handleDeleteLead}
              onSelectLead={(l) => setSelectedLeadId(l.id)}
              selectedLeadId={selectedLeadId}
              onSyncSheets={handleSyncSheets}
            />
          </div>

          {/* Right panel - Interaction Logs / details (25% width) */}
          <div className="lg:col-span-3 flex flex-col">
            <InteractionLogger
              lead={selectedLead}
              interactions={selectedLeadInteractions}
              onAddInteraction={handleAddInteraction}
              onClose={() => setSelectedLeadId(null)}
            />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/60 bg-zinc-950 py-4 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Outreach Tracker CRM © {new Date().getFullYear()} — Secure OAuth Google & Supabase Integration
      </footer>
    </div>
  )
}
