import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getSentEmails } from "@/lib/gmail"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    let accessToken: string | undefined = undefined

    const session = await getServerSession(authOptions)
    if (session?.accessToken) {
      accessToken = session.accessToken
    }

    if (!accessToken) {
      const authHeader = req.headers.get("Authorization")
      if (authHeader?.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7)
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in with Google." },
        { status: 401 }
      )
    }

    let emailsProcessed = 0
    let touchpointsCreated = 0
    let repliesDetected = 0

    // 2. Fetch Sent Emails
    const sentEmails = await getSentEmails(accessToken)
    emailsProcessed = sentEmails.length

    // 3. Match against Leads
    for (const email of sentEmails) {
      const { data: lead } = await supabase
        .from("leads")
        .select("id, status")
        .eq("email", email.recipient)
        .maybeSingle()

      if (lead) {
        // Check if we already logged this interaction recently (prevent duplicates)
        const { data: existingInts } = await supabase
          .from("interactions")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("type", "email")
          .like("notes", `%${email.subject}%`)
          .limit(1)

        if (!existingInts || existingInts.length === 0) {
          // Insert Touchpoint
          await supabase.from("interactions").insert([{
            lead_id: lead.id,
            type: "email",
            notes: `Sent Email: ${email.subject}`,
            sentiment: "neutral",
            created_at: email.date
          }])
          touchpointsCreated++

          // Update lead status to contacted if it was just a prospect
          if (lead.status === "prospect") {
            await supabase.from("leads").update({ status: "contacted", updated_at: new Date().toISOString() }).eq("id", lead.id)
          }
        }
      }
    }

    // 4. Detect Replies for Contacted Leads
    const { data: contactedLeads } = await supabase
      .from("leads")
      .select("id, email, status")
      .eq("status", "contacted")

    for (const lead of contactedLeads || []) {
      if (!lead.email) continue;
      
      // Query Gmail for any message from this lead
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:${lead.email}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (!res.ok) continue;
      
      const data = await res.json()
      if (data.messages && data.messages.length > 0) {
        // Lead has replied!
        const msgId = data.messages[0].id
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (detailRes.ok) {
          const detail = await detailRes.json()
          const headers = detail.payload?.headers || []
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "Reply Received"
          const dateMs = parseInt(detail.internalDate, 10)
          const dateStr = !isNaN(dateMs) ? new Date(dateMs).toISOString() : new Date().toISOString()

          await supabase.from("interactions").insert([{
            lead_id: lead.id,
            type: "email",
            notes: `Received Reply: ${subject}`,
            sentiment: "positive",
            created_at: dateStr
          }])
          touchpointsCreated++
          repliesDetected++

          // Update status to replied
          await supabase.from("leads").update({ status: "replied", updated_at: new Date().toISOString() }).eq("id", lead.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: { emailsProcessed, touchpointsCreated, repliesDetected }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
