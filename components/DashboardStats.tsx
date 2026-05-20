import React from "react"
import { Lead, Interaction } from "@/lib/dataService"
import { Icons } from "./Icons"

interface StatsProps {
  leads: Lead[]
  interactions: Interaction[]
}

export default function DashboardStats({ leads, interactions }: StatsProps) {
  const totalLeads = leads.length
  
  const contactedLeads = leads.filter(l => 
    l.status !== 'prospect'
  ).length
  
  const convertedLeads = leads.filter(l => l.status === 'converted').length
  
  const contactedRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
  
  // Calculate Sentiment breakdown
  const positiveInteractions = interactions.filter(i => i.sentiment === 'positive').length
  const totalSentimentInts = interactions.filter(i => i.sentiment).length
  const positiveSentimentRate = totalSentimentInts > 0 ? Math.round((positiveInteractions / totalSentimentInts) * 100) : 0

  const statItems = [
    {
      title: "Total Leads",
      value: totalLeads,
      description: "Prospects across all campaigns",
      icon: <Icons.Leads className="text-indigo-400" size={24} />,
      bg: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20",
      progressColor: "bg-indigo-500",
      progressVal: 100
    },
    {
      title: "Contacted Rate",
      value: `${contactedRate}%`,
      description: `${contactedLeads} out of ${totalLeads} touched`,
      icon: <Icons.Mail className="text-violet-400" size={24} />,
      bg: "from-violet-500/10 to-fuchsia-500/10 border-violet-500/20",
      progressColor: "bg-violet-500",
      progressVal: contactedRate
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      description: `${convertedLeads} successful closures`,
      icon: <Icons.Check className="text-emerald-400" size={24} />,
      bg: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
      progressColor: "bg-emerald-500",
      progressVal: conversionRate
    },
    {
      title: "Positive Response",
      value: `${positiveSentimentRate}%`,
      description: "Based on logged sentiment",
      icon: <Icons.SentimentPositive className="text-amber-400" size={24} />,
      bg: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
      progressColor: "bg-amber-500",
      progressVal: positiveSentimentRate
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${item.bg}`}
        >
          {/* Accent Glow */}
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-current opacity-[0.03] blur-xl" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {item.title}
              </p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {item.value}
              </h3>
            </div>
            <div className="rounded-xl bg-zinc-900/50 p-3 ring-1 ring-white/10">
              {item.icon}
            </div>
          </div>
          
          <div className="mt-6">
            <div className="h-1.5 w-full rounded-full bg-zinc-800">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${item.progressColor}`} 
                style={{ width: `${item.progressVal}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs font-medium text-zinc-500">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
