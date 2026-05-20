import React, { useState } from "react"
import { Lead, Interaction } from "@/lib/dataService"
import { Icons } from "./Icons"

interface InteractionLoggerProps {
  lead: Lead | null
  interactions: Interaction[]
  onAddInteraction: (leadId: string, type: Interaction["type"], notes: string, sentiment: Interaction["sentiment"]) => Promise<void>
  onClose: () => void
}

const TYPE_ICONS: Record<Interaction["type"], React.ReactNode> = {
  email: <Icons.Mail size={14} className="text-blue-400" />,
  call: <Icons.Phone size={14} className="text-emerald-400" />,
  linkedin: <Icons.LinkedIn size={14} className="text-sky-400" />,
  meeting: <Icons.Meeting size={14} className="text-purple-400" />,
  other: <Icons.Campaign size={14} className="text-zinc-400" />
}

const SENTIMENT_COLORS: Record<NonNullable<Interaction["sentiment"]>, { text: string; bg: string }> = {
  positive: { text: "text-emerald-400 border-emerald-500/20", bg: "bg-emerald-500/10" },
  neutral: { text: "text-zinc-400 border-zinc-500/20", bg: "bg-zinc-500/10" },
  negative: { text: "text-rose-400 border-rose-500/20", bg: "bg-rose-500/10" }
}

export default function InteractionLogger({
  lead,
  interactions,
  onAddInteraction,
  onClose
}: InteractionLoggerProps) {
  const [showLogForm, setShowLogForm] = useState(false)
  const [type, setType] = useState<Interaction["type"]>("email")
  const [notes, setNotes] = useState("")
  const [sentiment, setSentiment] = useState<Interaction["sentiment"]>("neutral")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!lead) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md shadow-xl h-full flex flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800 text-zinc-600 mb-4">
          <Icons.Leads size={36} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-400">No Prospect Selected</h3>
        <p className="text-xs text-zinc-600 mt-1 max-w-[200px] leading-relaxed">
          Select a prospect from the lead pipeline to view their detailed timeline, notes, and log new touchpoints.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return
    setIsSubmitting(true)
    try {
      await onAddInteraction(lead.id, type, notes, sentiment)
      setNotes("")
      setShowLogForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-md shadow-xl h-full flex flex-col min-h-0 relative">
      {/* Close button for responsiveness */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 rounded-lg p-1.5 hover:bg-zinc-800/50"
      >
        <Icons.Check size={14} className="rotate-45" />
      </button>

      {/* Selected Lead Info */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-lg">
            {lead.first_name[0]}
            {lead.last_name ? lead.last_name[0] : ""}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight leading-none truncate">
              {lead.first_name} {lead.last_name}
            </h3>
            <span className="text-[11px] text-zinc-400 font-medium block mt-1.5 leading-snug pr-2">
              {lead.role} <span className="text-zinc-600 mx-1">•</span> {lead.company}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-zinc-950/80 p-3.5 text-xs border border-zinc-800/60 shadow-inner">
          <div className="flex justify-between items-start gap-4">
            <span className="text-zinc-500 font-medium whitespace-nowrap">Email:</span>
            <span className="text-zinc-200 font-medium text-right break-all">{lead.email || "No Email"}</span>
          </div>
          {lead.linkedin_link && (
            <div className="flex justify-between items-center gap-4">
              <span className="text-zinc-500 font-medium whitespace-nowrap">LinkedIn:</span>
              <a
                href={lead.linkedin_link.startsWith("http") ? lead.linkedin_link : `https://${lead.linkedin_link}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 transition-all text-right bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20"
              >
                <Icons.LinkedIn size={11} />
                View Profile
              </a>
            </div>
          )}
          {lead.notes && (
            <div className="mt-1 pt-3 border-t border-zinc-800/60">
              <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider mb-1.5">Context Notes</span>
              <p className="text-zinc-400 italic leading-relaxed text-[11px]">{lead.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Logging Controls */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Activity Timeline</h4>
        <button
          onClick={() => setShowLogForm(!showLogForm)}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-200 transition-all hover:-translate-y-0.5 shrink-0 shadow-sm"
        >
          <Icons.Plus size={10} />
          {showLogForm ? "Cancel" : "Add Touchpoint"}
        </button>
      </div>

      {/* Log Form */}
      {showLogForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 animate-slide-in">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Method
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Interaction["type"])}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="email">Email Sent</option>
              <option value="linkedin">LinkedIn Connection/InMail</option>
              <option value="call">Phone Call</option>
              <option value="meeting">Video Demo/Meeting</option>
              <option value="other">Other Touchpoint</option>
            </select>
          </div>
          
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Response Sentiment
            </label>
            <div className="flex gap-2">
              {(["positive", "neutral", "negative"] as const).map((sent) => {
                const isActive = sentiment === sent
                return (
                  <button
                    key={sent}
                    type="button"
                    onClick={() => setSentiment(sent)}
                    className={`flex-1 rounded-xl py-1 px-2 border text-xs capitalize flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold"
                        : "bg-zinc-950/20 border-zinc-800/80 text-zinc-500 hover:bg-zinc-950"
                    }`}
                  >
                    {sent === "positive" && <Icons.SentimentPositive size={13} />}
                    {sent === "neutral" && <Icons.SentimentNeutral size={13} />}
                    {sent === "negative" && <Icons.SentimentNegative size={13} />}
                    {sent}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Interaction Details
            </label>
            <textarea
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke to Sarah. Excited to trial next month. Scheduled demo..."
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? <Icons.Spinner size={12} /> : "Record Interaction"}
          </button>
        </form>
      )}

      {/* Interaction Timeline List */}
      <div className="mt-5 flex-1 overflow-y-auto pr-1 space-y-4">
        {interactions.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-800/80 rounded-2xl">
            <span className="text-xs font-semibold text-zinc-600 block">No Interactions Logged</span>
            <span className="text-[10px] text-zinc-700 block mt-1">Record the first cold pitch to track this conversation!</span>
          </div>
        ) : (
          interactions.map((item, idx) => {
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
            const sentCol = item.sentiment ? SENTIMENT_COLORS[item.sentiment] : null

            return (
              <div key={item.id} className="relative pl-6 pb-2 group animate-slide-in">
                {/* Visual Connector Line */}
                {idx !== interactions.length - 1 && (
                  <span className="absolute left-3 top-6 bottom-0 w-[1px] bg-zinc-800" />
                )}

                {/* Node Icon */}
                <div className="absolute left-1 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 shadow">
                  {TYPE_ICONS[item.type]}
                </div>

                {/* Content Box */}
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-3.5 hover:border-zinc-800 hover:bg-zinc-900/30 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 capitalize flex items-center gap-1.5">
                      {item.type}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-semibold">
                      {dateStr}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed font-medium">
                    {item.notes}
                  </p>

                  {item.sentiment && sentCol && (
                    <div className="mt-2.5 flex justify-end">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 ring-inset uppercase tracking-wider ${sentCol.bg} ${sentCol.text}`}>
                        {item.sentiment}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
