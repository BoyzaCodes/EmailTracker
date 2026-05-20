import { supabase } from "./supabase"

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
  role: string
  status: 'prospect' | 'contacted' | 'replied' | 'converted' | 'rejected'
  notes: string
  linkedin_link?: string
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  lead_id: string
  type: 'email' | 'call' | 'linkedin' | 'meeting' | 'other'
  notes: string
  sentiment: 'positive' | 'neutral' | 'negative'
  created_at: string
}

export interface Contact {
  id: string
  email: string
  status: 'Awaiting Response' | 'Replied' | 'Active Conversation' | 'FollowUp Pending' | 'prospect'
  last_contacted: string
  subject?: string
  thread_id?: string
  replied: boolean
  last_reply?: string
  name?: string
  organization?: string
  linkedin_link?: string
  created_at: string
  updated_at: string
}

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', email: 'bill@gatesfoundation.org', status: 'Awaiting Response', last_contacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), subject: 'Partnership Proposal', thread_id: 't1', replied: false, name: 'Bill Gates', organization: 'Gates Foundation', linkedin_link: 'https://linkedin.com/in/williamhgates', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2', email: 'elon@spacex.com', status: 'Replied', last_contacted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), subject: 'Mars Colony Logistics', thread_id: 't2', replied: true, last_reply: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), name: 'Elon Musk', organization: 'SpaceX', linkedin_link: 'https://linkedin.com/in/elonmusk', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3', email: 'satya@microsoft.com', status: 'FollowUp Pending', last_contacted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), subject: 'AI Integration Call', thread_id: 't3', replied: false, name: 'Satya Nadella', organization: 'Microsoft', linkedin_link: 'https://linkedin.com/in/satyanadella', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]

const MOCK_LEADS: Lead[] = [
  { id: 'l1000000-0000-0000-0000-000000000000', first_name: 'Sarah', last_name: 'Jenkins', email: 'sarah@acme.corp', company: 'Acme Corp', role: 'VP of Engineering', status: 'converted', notes: 'Very enthusiastic about our scalability and security features.', linkedin_link: 'https://linkedin.com/in/sarah-jenkins-acme', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l2000000-0000-0000-0000-000000000000', first_name: 'David', last_name: 'Chen', email: 'dchen@starlight.io', company: 'Starlight.io', role: 'CTO', status: 'replied', notes: 'Requested a detailed pricing sheet for 50+ seats.', linkedin_link: 'https://linkedin.com/in/david-chen-starlight', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l3000000-0000-0000-0000-000000000000', first_name: 'Marcus', last_name: 'Aurelius', email: 'marcus@roman.net', company: 'Roman Enterprises', role: 'Director of Infrastructure', status: 'contacted', notes: 'Sent the initial calendar invite.', linkedin_link: 'https://linkedin.com/in/marcus-aurelius-roman', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l4000000-0000-0000-0000-000000000000', first_name: 'Jane', last_name: 'Doe', email: 'jane@beta.dev', company: 'BetaDev', role: 'Lead Developer', status: 'prospect', notes: 'Discovered from GitHub contributors list.', linkedin_link: 'https://linkedin.com/in/jane-doe-betadev', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
]

const MOCK_INTERACTIONS: Interaction[] = [
  { id: 'i1000000-0000-0000-0000-000000000000', lead_id: 'l1000000-0000-0000-0000-000000000000', type: 'email', notes: 'Sent initial cold pitch highlighting security compliance.', sentiment: 'neutral', created_at: new Date().toISOString() },
  { id: 'i2000000-0000-0000-0000-000000000000', lead_id: 'l1000000-0000-0000-0000-000000000000', type: 'linkedin', notes: 'Follow-up on LinkedIn. Sarah connected and asked for a demo call.', sentiment: 'positive', created_at: new Date().toISOString() },
  { id: 'i3000000-0000-0000-0000-000000000000', lead_id: 'l1000000-0000-0000-0000-000000000000', type: 'meeting', notes: 'Had a 30m demo call. Walked through dashboard. Closed!', sentiment: 'positive', created_at: new Date().toISOString() },
  { id: 'i4000000-0000-0000-0000-000000000000', lead_id: 'l2000000-0000-0000-0000-000000000000', type: 'email', notes: 'Cold outreach sent.', sentiment: 'neutral', created_at: new Date().toISOString() },
  { id: 'i5000000-0000-0000-0000-000000000000', lead_id: 'l2000000-0000-0000-0000-000000000000', type: 'email', notes: 'David replied: Can you send your enterprise pricing tiers?', sentiment: 'positive', created_at: new Date().toISOString() }
]

// Keep tracking dynamic status
let useFallback = false

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function getLocal<T>(key: string, def: T[]): T[] {
  if (!isBrowser()) return def
  const val = localStorage.getItem(key)
  if (!val) {
    localStorage.setItem(key, JSON.stringify(def))
    return def
  }
  try {
    return JSON.parse(val)
  } catch (e) {
    return def
  }
}

function setLocal<T>(key: string, data: T[]): void {
  if (isBrowser()) {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export async function checkConnection(): Promise<{ connected: boolean; source: 'supabase' | 'sandbox' }> {
  try {
    const { data, error } = await supabase.from('leads').select('id').limit(1)
    if (error) {
      console.warn("Supabase connection failed, switching to sandbox mode:", error.message)
      useFallback = true
      return { connected: false, source: 'sandbox' }
    }
    useFallback = false
    return { connected: true, source: 'supabase' }
  } catch (err) {
    console.warn("Supabase check exception, using sandbox fallback:", err)
    useFallback = true
    return { connected: false, source: 'sandbox' }
  }
}

// LEADS API
export async function getLeads(): Promise<Lead[]> {
  if (useFallback) {
    return getLocal<Lead>('ot_leads', MOCK_LEADS)
  }

  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error("Supabase fetch leads error. Falling back to sandbox.", err)
    useFallback = true
    return getLocal<Lead>('ot_leads', MOCK_LEADS)
  }
}

export async function addLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
  const newLead: Lead = {
    ...lead,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (useFallback) {
    const items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    items.unshift(newLead)
    setLocal('ot_leads', items)
    return newLead
  }

  try {
    const { data, error } = await supabase.from('leads').insert([newLead]).select()
    if (error) throw error
    return data[0]
  } catch (err) {
    console.error("Supabase add lead error. Falling back to sandbox.", err)
    useFallback = true
    const items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    items.unshift(newLead)
    setLocal('ot_leads', items)
    return newLead
  }
}

export async function updateLeadStatus(leadId: string, status: Lead['status']): Promise<void> {
  if (useFallback) {
    const items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    const idx = items.findIndex(x => x.id === leadId)
    if (idx !== -1) {
      items[idx].status = status
      items[idx].updated_at = new Date().toISOString()
      setLocal('ot_leads', items)
    }
    return
  }

  try {
    const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', leadId)
    if (error) throw error
  } catch (err) {
    console.error("Supabase update lead error. Falling back to sandbox.", err)
    useFallback = true
    const items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    const idx = items.findIndex(x => x.id === leadId)
    if (idx !== -1) {
      items[idx].status = status
      items[idx].updated_at = new Date().toISOString()
      setLocal('ot_leads', items)
    }
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  if (useFallback) {
    let items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    items = items.filter(x => x.id !== leadId)
    setLocal('ot_leads', items)
    return
  }

  try {
    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) throw error
  } catch (err) {
    console.error("Supabase delete lead error. Falling back to sandbox.", err)
    useFallback = true
    let items = getLocal<Lead>('ot_leads', MOCK_LEADS)
    items = items.filter(x => x.id !== leadId)
    setLocal('ot_leads', items)
  }
}

// INTERACTIONS API
export async function getInteractions(leadId?: string): Promise<Interaction[]> {
  if (useFallback) {
    const items = getLocal<Interaction>('ot_interactions', MOCK_INTERACTIONS)
    if (leadId) return items.filter(x => x.lead_id === leadId)
    return items
  }

  try {
    let query = supabase.from('interactions').select('*')
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error("Supabase fetch interactions error. Falling back to sandbox.", err)
    useFallback = true
    const items = getLocal<Interaction>('ot_interactions', MOCK_INTERACTIONS)
    if (leadId) return items.filter(x => x.lead_id === leadId)
    return items
  }
}

export async function addInteraction(leadId: string, type: Interaction['type'], notes: string, sentiment: Interaction['sentiment']): Promise<Interaction> {
  const newInt: Interaction = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    lead_id: leadId,
    type,
    notes,
    sentiment,
    created_at: new Date().toISOString()
  }

  if (useFallback) {
    const items = getLocal<Interaction>('ot_interactions', MOCK_INTERACTIONS)
    items.unshift(newInt)
    setLocal('ot_interactions', items)

    let newStatus: Lead['status'] = 'contacted'
    if (type === 'meeting') newStatus = 'replied'
    
    await updateLeadStatus(leadId, newStatus)
    return newInt
  }

  try {
    const { data, error } = await supabase.from('interactions').insert([newInt]).select()
    if (error) throw error

    let newStatus: Lead['status'] = 'contacted'
    if (type === 'meeting') newStatus = 'replied'
    await updateLeadStatus(leadId, newStatus)

    return data[0]
  } catch (err) {
    console.error("Supabase add interaction error. Falling back to sandbox.", err)
    useFallback = true
    const items = getLocal<Interaction>('ot_interactions', MOCK_INTERACTIONS)
    items.unshift(newInt)
    setLocal('ot_interactions', items)

    let newStatus: Lead['status'] = 'contacted'
    if (type === 'meeting') newStatus = 'replied'
    await updateLeadStatus(leadId, newStatus)

    return newInt
  }
}

// CONTACTS API
export async function getContacts(): Promise<Contact[]> {
  if (useFallback) {
    return getLocal<Contact>('ot_contacts', MOCK_CONTACTS)
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('last_contacted', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error("Supabase fetch contacts error. Falling back to sandbox.", err)
    useFallback = true
    return getLocal<Contact>('ot_contacts', MOCK_CONTACTS)
  }
}

