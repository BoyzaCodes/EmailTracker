import React, { useState, useRef, useEffect } from "react"
import { Lead } from "@/lib/dataService"
import { Icons } from "./Icons"

interface LeadTableProps {
  leads: Lead[]
  onAddLead: (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => Promise<void>
  onUpdateStatus: (id: string, status: Lead["status"]) => Promise<void>
  onDeleteLead: (id: string) => Promise<void>
  onSelectLead: (lead: Lead) => void
  selectedLeadId: string | null
  onSyncSheets?: (sheetId?: string) => Promise<void>
}

const STATUS_BADGES: Record<Lead["status"], { label: string; bg: string; text: string; ring: string }> = {
  prospect: { label: "Prospect", bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  contacted: { label: "Contacted", bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
  replied: { label: "Replied", bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/20" },
  converted: { label: "Converted", bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  rejected: { label: "Rejected", bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20" }
}

const formatLinkedInUrl = (url: string | null | undefined): string => {
  if (!url) return ""
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (trimmed.includes("@") && !trimmed.includes("linkedin.com")) {
    return `mailto:${trimmed}`
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  return `https://${trimmed}`
}

export default function LeadTable({
  leads,
  onAddLead,
  onUpdateStatus,
  onDeleteLead,
  onSelectLead,
  selectedLeadId,
  onSyncSheets
}: LeadTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Lead["status"] | "all">("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [isSyncingSheets, setIsSyncingSheets] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
  const [copiedToast, setCopiedToast] = useState<string | null>(null)

  const handleSyncSheets = async () => {
    if (!onSyncSheets) return
    
    // Extract sheet ID from full URL if pasted
    let targetSheetId = sheetUrl.trim()
    if (targetSheetId.includes("docs.google.com/spreadsheets")) {
      const match = targetSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (match && match[1]) {
        targetSheetId = match[1]
      }
    }

    setIsSyncingSheets(true)
    try {
      await onSyncSheets(targetSheetId || undefined)
      setSheetUrl("")
      setShowSyncPanel(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSyncingSheets(false)
    }
  }

  const [isSyncingGmail, setIsSyncingGmail] = useState(false)
  const handleSyncGmail = async () => {
    setIsSyncingGmail(true)
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      const result = await res.json()
      
      if (res.ok && result.success) {
        alert(`Gmail Sync Complete!\nEmails Processed: ${result.summary.emailsProcessed}\nNew Touchpoints: ${result.summary.touchpointsCreated}\nReplies Detected: ${result.summary.repliesDetected}`)
        window.location.reload()
      } else {
        alert(`Sync Error: ${result.error || "Unknown error occurred"}`)
      }
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`)
    } finally {
      setIsSyncingGmail(false)
    }
  }

  // Form State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtering Logic
  const filteredLeads = leads.filter((lead) => {
    // 1. Status Filter
    if (statusFilter !== "all" && lead.status !== statusFilter) return false
    // 2. Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase()
      return (
        fullName.includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        lead.company.toLowerCase().includes(q) ||
        (lead.role && lead.role.toLowerCase().includes(q))
      )
    }
    return true
  })

  const filteredLeadIds = filteredLeads.map((l) => l.id)
  const isAllSelected = filteredLeadIds.length > 0 && filteredLeadIds.every((id) => selectedRowIds.includes(id))
  const isSomeSelected = filteredLeadIds.length > 0 && filteredLeadIds.some((id) => selectedRowIds.includes(id)) && !isAllSelected

  const masterCheckboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeSelected
    }
  }, [isSomeSelected])

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !filteredLeadIds.includes(id)))
    } else {
      setSelectedRowIds((prev) => {
        const newSelection = [...prev]
        filteredLeadIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id)
          }
        })
        return newSelection
      })
    }
  }

  const handleToggleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    )
  }

  const handleCopyIndividualEmail = (email: string | null | undefined, name: string) => {
    if (!email) {
      setCopiedToast(`No email available for ${name}`)
      setTimeout(() => setCopiedToast(null), 3000)
      return
    }
    navigator.clipboard.writeText(email)
    setCopiedToast(`Copied ${email} to clipboard!`)
    setTimeout(() => setCopiedToast(null), 3000)
  }

  const handleCopySelectedEmails = () => {
    const selectedEmails = leads
      .filter((l) => selectedRowIds.includes(l.id) && l.email)
      .map((l) => l.email!)

    if (selectedEmails.length === 0) {
      setCopiedToast("No selected prospects have emails!")
      setTimeout(() => setCopiedToast(null), 3000)
      return
    }

    const emailListStr = selectedEmails.join(", ")
    navigator.clipboard.writeText(emailListStr)
    setCopiedToast(`Copied ${selectedEmails.length} email(s) to clipboard!`)
    setTimeout(() => setCopiedToast(null), 3000)
  }

  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return
    if (confirm(`Are you sure you want to remove the ${selectedRowIds.length} selected lead(s)?`)) {
      try {
        await Promise.all(selectedRowIds.map((id) => onDeleteLead(id)))
        setCopiedToast(`Successfully removed ${selectedRowIds.length} lead(s).`)
        setSelectedRowIds([])
        setTimeout(() => setCopiedToast(null), 3000)
      } catch (err) {
        console.error(err)
        setCopiedToast("Failed to delete some leads.")
        setTimeout(() => setCopiedToast(null), 3000)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !company.trim()) return

    setIsSubmitting(true)
    try {
      await onAddLead({
        first_name: firstName,
        last_name: lastName,
        email,
        company,
        role,
        status: "prospect",
        notes
      })
      setFirstName("")
      setLastName("")
      setEmail("")
      setCompany("")
      setRole("")
      setNotes("")
      setShowAddForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md shadow-xl flex-1 flex flex-col min-h-0">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lead Pipeline</h2>
          <p className="text-xs text-zinc-500 mt-1">Manage pipeline conversions and historic timelines</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full max-w-xs sm:w-56">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-600">
              <Icons.Search size={16} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads, companies..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-600 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sync Sheets Trigger */}
          {onSyncSheets && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSyncPanel(!showSyncPanel)
                  setShowAddForm(false)
                }}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 cursor-pointer ${
                  showSyncPanel
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
                }`}
                title="Sync prospects from Google Sheets"
              >
                <Icons.LinkedIn size={14} className="text-emerald-400" />
                Sync Sheets
              </button>

              <button
                onClick={handleSyncGmail}
                disabled={isSyncingGmail}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 transition-all hover:-translate-y-0.5 hover:bg-rose-500/20 cursor-pointer disabled:opacity-50 disabled:-translate-y-0"
                title="Sync sent emails and replies from Gmail"
              >
                {isSyncingGmail ? <Icons.Spinner size={14} className="animate-spin text-rose-400" /> : <Icons.Mail size={14} className="text-rose-400" />}
                {isSyncingGmail ? "Syncing..." : "Sync Gmail"}
              </button>
            </div>
          )}

          {/* Top Bulk Actions Dropdown */}
          <div className="relative inline-block text-left">
            <button
              onClick={() => {
                if (selectedRowIds.length > 0) {
                  setActiveDropdownId(activeDropdownId === "bulk" ? null : "bulk")
                }
              }}
              disabled={selectedRowIds.length === 0}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold shadow-md transition-all ${
                selectedRowIds.length > 0 
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:-translate-y-0.5 cursor-pointer" 
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <span>Bulk Actions {selectedRowIds.length > 0 ? `(${selectedRowIds.length})` : ""}</span>
              <span className="text-[10px]">▼</span>
            </button>

            {activeDropdownId === "bulk" && selectedRowIds.length > 0 && (
              <div className="absolute right-0 mt-1.5 w-48 z-[100] rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl backdrop-blur-md origin-top-right animate-slide-in">
                <button
                  onClick={() => {
                    handleCopySelectedEmails()
                    setActiveDropdownId(null)
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                >
                  <Icons.Copy size={13} className="text-zinc-400" />
                  Copy Emails
                </button>
                <button
                  onClick={() => {
                    handleBulkDelete()
                    setActiveDropdownId(null)
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
                >
                  <Icons.Trash size={13} className="text-rose-400" />
                  Delete Selected
                </button>
                <div className="border-t border-zinc-800/80 my-1" />
                <button
                  onClick={() => {
                    setSelectedRowIds([])
                    setActiveDropdownId(null)
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-zinc-500 hover:bg-zinc-900 hover:text-zinc-400 transition-all cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* New Lead Trigger */}
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setShowSyncPanel(false)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/10 transition-all hover:bg-indigo-500 hover:-translate-y-0.5"
          >
            <Icons.Plus size={14} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Inline Sync Sheets form */}
      {showSyncPanel && (
        <div className="mt-5 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 animate-slide-in">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Synchronize Google Sheet Dataset</h3>
          
          <div className="flex flex-col gap-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Google Sheet URL or Spreadsheet ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSyncSheets}
                disabled={isSyncingSheets || !sheetUrl.trim()}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/10 transition-all hover:bg-sky-500 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSyncingSheets ? (
                  <Icons.Spinner size={12} className="text-white animate-spin" />
                ) : (
                  <Icons.LinkedIn size={12} className="text-white" />
                )}
                {isSyncingSheets ? "Syncing..." : "Sync Now"}
              </button>
            </div>
            {/* The small text popup at the bottom */}
            <p className="text-[10px] text-amber-400/90 font-medium leading-relaxed mt-1 flex items-start gap-1">
              <span>⚠️</span>
              <span>
                <strong>Required Permission Note:</strong> Make sure that the target Google Sheet's access is configured so that <strong>Anyone with the link can edit</strong> (or Anyone with the link can view) to allow our integration to fetch the data.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Inline Add Lead form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 animate-slide-in">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Seeding New Prospect</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sarah"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Jenkins"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Company *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="VP of Engineering"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@acme.corp"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Context Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial details, social hooks, or connection reference..."
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? <Icons.Spinner size={14} /> : "Seed Prospect"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-semibold text-zinc-400 hover:bg-zinc-900"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide border transition-all ${
            statusFilter === "all"
              ? "bg-zinc-100 text-zinc-900 border-zinc-100"
              : "bg-zinc-950/20 text-zinc-400 border-zinc-800/80 hover:bg-zinc-900"
          }`}
        >
          All Stages
        </button>
        {Object.entries(STATUS_BADGES).map(([key, value]) => {
          const isSelected = statusFilter === key
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key as Lead["status"])}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? `${value.bg} ${value.text} border-current ring-1 ring-current`
                  : "bg-zinc-950/20 text-zinc-500 border-zinc-800/80 hover:bg-zinc-900"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${value.bg.replace('/10', '')} bg-current`} />
              {value.label}
            </button>
          )
        })}
      </div>

      {/* Click overlay to close dropdowns */}
      {activeDropdownId && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setActiveDropdownId(null)}
        />
      )}

      {/* Table Container */}
      <div className="mt-6 flex-1 overflow-x-auto min-h-[300px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <th className="pb-3 pl-2 w-10">
                <div className="flex items-center justify-center pl-1">
                  <input
                    type="checkbox"
                    ref={masterCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer accent-indigo-500"
                  />
                </div>
              </th>
              <th className="pb-3 pl-2">Prospect</th>
              <th className="pb-3">Title & Company</th>
              <th className="pb-3">Conversion Stage</th>
              <th className="pb-3 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40 text-xs">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500 font-medium border border-dashed border-zinc-800/80 rounded-2xl">
                  No prospects found matching selection criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = lead.id === selectedLeadId
                const badge = STATUS_BADGES[lead.status]
                const isRowChecked = selectedRowIds.includes(lead.id)
                
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-pointer transition-all duration-150 hover:bg-zinc-800/30 ${
                      isSelected ? "bg-indigo-500/5 ring-1 ring-indigo-500/20" : ""
                    } ${isRowChecked ? "bg-zinc-800/20" : ""}`}
                  >
                    {/* Checkbox column */}
                    <td className="py-4 pl-2 w-10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center pl-1">
                        <input
                          type="checkbox"
                          checked={isRowChecked}
                          onChange={(e) => handleToggleSelectRow(lead.id, e)}
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/20 focus:ring-offset-0 focus:outline-none transition-all cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </td>

                    {/* Avatar and name */}
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white shadow-md">
                          {lead.first_name[0]}
                          {lead.last_name ? lead.last_name[0] : ""}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-100 block">
                              {lead.first_name} {lead.last_name}
                            </span>
                            {lead.linkedin_link && (
                              <a
                                href={formatLinkedInUrl(lead.linkedin_link)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sky-400 hover:text-sky-300 transition-all"
                                title="View LinkedIn Profile"
                              >
                                <Icons.LinkedIn size={12} className="inline" />
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {lead.email || "No Email"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Company and Role */}
                    <td className="py-4">
                      <div>
                        <span className="text-zinc-300 font-medium block">{lead.role || "No Title"}</span>
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{lead.company}</span>
                      </div>
                    </td>

                    {/* Pipeline status dropdown */}
                    <td className="py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead["status"])}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset focus:outline-none transition-all ${badge.bg} ${badge.text} ${badge.ring} bg-zinc-950 border-none cursor-pointer`}
                      >
                        {Object.entries(STATUS_BADGES).map(([val, item]) => (
                          <option key={val} value={val} className="bg-zinc-950 text-white font-medium">
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Actions Dropdown */}
                    <td className="py-4 text-right pr-2 relative" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-block text-left relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdownId(activeDropdownId === lead.id ? null : lead.id)
                          }}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-400 bg-zinc-950 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-sm"
                          title="Actions"
                        >
                          <span>Actions</span>
                          <span className="text-[9px] opacity-75">▼</span>
                        </button>
                        
                        {activeDropdownId === lead.id && (
                          <div className="absolute right-0 mt-1.5 w-40 z-50 rounded-xl border border-zinc-800/90 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur-md origin-top-right animate-slide-in">
                            <button
                              onClick={() => {
                                handleCopyIndividualEmail(lead.email, `${lead.first_name} ${lead.last_name}`)
                                setActiveDropdownId(null)
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                            >
                              <Icons.Copy size={13} className="text-zinc-400" />
                              Copy Email
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${lead.first_name} ${lead.last_name}?`)) {
                                  onDeleteLead(lead.id)
                                }
                                setActiveDropdownId(null)
                              }}
                              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
                            >
                              <Icons.Trash size={13} className="text-rose-400" />
                              Remove Lead
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedRowIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/90 px-5 py-3 shadow-2xl backdrop-blur-xl animate-slide-up">
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-4">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
              {selectedRowIds.length}
            </span>
            <span className="text-xs font-medium text-zinc-300">selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySelectedEmails}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Icons.Copy size={13} />
              Copy Emails
            </button>
            
            <button
              onClick={() => setSelectedRowIds([])}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-zinc-950/90 px-4 py-3 text-xs font-semibold text-indigo-300 shadow-2xl backdrop-blur-md">
          <Icons.Check size={14} className="text-emerald-400" />
          {copiedToast}
        </div>
      )}
    </div>
  )
}
