import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { readSheetContacts } from "@/lib/sheets"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
  try {
    // 1. Resolve Session Access Token (Google Auth)
    const session = await getServerSession(authOptions)
    let token = session?.accessToken as string | undefined

    // Fallback support: Bearer Authorization token header
    if (!token) {
      const authHeader = req.headers.get("Authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized. Google OAuth authentication or a valid Sheets API key is required to read Google Sheets." },
        { status: 401 }
      )
    }

    // Read sheetId dynamically from body payload
    let sheetId: string | undefined
    try {
      const body = await req.json()
      sheetId = body?.sheetId
    } catch (e) {
      // Body payload is empty or not JSON, fallback to default behavior
    }

    // 2. Fetch sheet contacts from Google REST values endpoint
    const sheetContacts = await readSheetContacts(token, sheetId)
    if (sheetContacts.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No contact records found in the specified Google Sheet range."
      })
    }

    let addedCount = 0
    let updatedCount = 0
    
    // 3. Iterate and Upsert contacts (enriching contacts and leads tables)
    for (const c of sheetContacts) {
      // A. Upsert into contacts table (with ultra-resilience against schema cache issues)
      const contactData: any = {
        email: c.email,
        name: c.name,
        organization: c.organization,
        status: "prospect",
        updated_at: new Date().toISOString()
      }

      if (c.linkedinLink) {
        contactData.linkedin_link = c.linkedinLink
      }

      let { error: contactErr } = await supabase
        .from("contacts")
        .upsert(contactData, { onConflict: "email" })

      if (contactErr) {
        console.error(`[Sheets Sync] Error upserting contact ${c.email}:`, contactErr.message)
        
        // If it's a schema cache or missing column issue, retry without linkedin_link
        if (contactErr.message.toLowerCase().includes("linkedin_link") || contactErr.message.toLowerCase().includes("schema cache")) {
          console.log(`[Sheets Sync] Retrying ${c.email} without 'linkedin_link' field...`)
          const fallbackData = { ...contactData }
          delete fallbackData.linkedin_link
          
          const { error: retryErr } = await supabase
            .from("contacts")
            .upsert(fallbackData, { onConflict: "email" })
            
          if (retryErr) {
            console.error(`[Sheets Sync] Fallback contact upsert failed for ${c.email}:`, retryErr.message)
          } else {
            contactErr = null // cleared successfully!
          }
        }
      }

      // B. Upsert into leads table for visibility in CRM Pipeline UI
      const nameParts = c.name.trim().split(/\s+/)
      const firstName = nameParts[0] || "Imported"
      const lastName = nameParts.slice(1).join(" ") || "Prospect"

      const upsertData: any = {
        email: c.email,
        first_name: firstName,
        last_name: lastName,
        company: c.organization || "Imported Org",
        updated_at: new Date().toISOString()
      }

      if (c.linkedinLink) {
        upsertData.linkedin_link = c.linkedinLink
      }
      if (c.role) {
        upsertData.role = c.role
      }

      const { error: upsertErr } = await supabase
        .from("leads")
        .upsert(upsertData, { onConflict: "email" });

      if (upsertErr) {
        console.error(`[Sheets Sync] Failed to upsert lead ${c.email}:`, upsertErr.message);
        // Retry without linkedin_link if schema issue
        if (upsertErr.message.toLowerCase().includes("linkedin_link") || upsertErr.message.toLowerCase().includes("schema cache")) {
          console.log(`[Sheets Sync] Retrying upsert for lead ${c.email} without 'linkedin_link'...`);
          const fallbackUpsert = { ...upsertData };
          delete fallbackUpsert.linkedin_link;
          const { error: retryErr } = await supabase
            .from("leads")
            .upsert(fallbackUpsert, { onConflict: "email" });
          if (!retryErr) {
            const { data: existing } = await supabase.from("leads").select("id").eq("email", c.email).single();
            if (existing) {
              updatedCount++;
            } else {
              addedCount++;
            }
          }
        }
      } else {
        const { data: existingLead } = await supabase.from("leads").select("id").eq("email", c.email).single();
        if (existingLead) {
          updatedCount++;
        } else {
          addedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        contactsProcessed: sheetContacts.length,
        leadsCreated: addedCount,
        leadsUpdated: updatedCount
      },
      message: `Sheets synchronization successful: processed ${sheetContacts.length} contacts (${addedCount} newly added, ${updatedCount} updated in pipeline).`
    })
  } catch (err: any) {
    console.error("[Sheets Sync Endpoint Error]", err)
    return NextResponse.json(
      { error: err.message || "Failed to process sheets sync request." },
      { status: 500 }
    )
  }
}
