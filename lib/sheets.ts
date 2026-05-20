export interface SheetContact {
  name: string
  organization: string
  email: string
  linkedinLink: string
  role?: string
}

/**
 * Fetches contact rows from a Google Sheet using the Sheets API v4 REST endpoint.
 * Requires user's authenticated Google OAuth access token.
 * 
 * Column order expected: Name | Organization | Email | Linkedin Link
 */
export async function readSheetContacts(accessToken?: string, sheetId?: string): Promise<SheetContact[]> {
  const spreadsheetId = sheetId || process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId || spreadsheetId === "your_google_sheet_id_here") {
    throw new Error("No Google Sheet ID configured. Please supply a valid Google Sheet URL or ID to enable synchronization.")
  }

  const range = "Sheet1!A:Z" // Read first sheet, capturing all potential columns

  const apiKey = process.env.GOOGLE_API_KEY

  // Helper function to make the API fetch
  const fetchFromSheets = async (token?: string, useKey?: boolean) => {
    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
    if (useKey && apiKey) {
      url += `?key=${apiKey}`
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return fetch(url, { headers })
  }

  console.log(`[Sheets API] Fetching from spreadsheet ID: ${spreadsheetId}...`)
  
  let res: Response
  let usingOAuth = false

  // Scenario 1: If we have a user OAuth token, try using it alone first (no API key to avoid credential conflict)
  if (accessToken) {
    usingOAuth = true
    console.log("[Sheets API] Attempting fetch using User OAuth token...")
    res = await fetchFromSheets(accessToken, false)
    
    // Scenario 2: If OAuth returned 401/403 (expired or unauthorized) and we have an API Key, try fallback
    if (!res.ok && (res.status === 401 || res.status === 403) && apiKey) {
      console.warn("[Sheets API] OAuth fetch failed (401/403). Falling back to API Key check for public sheet...")
      res = await fetchFromSheets(undefined, true)
      usingOAuth = false
    }
  } else {
    // Scenario 3: No OAuth token, try API Key directly
    console.log("[Sheets API] No OAuth token found. Attempting fetch using GOOGLE_API_KEY...")
    res = await fetchFromSheets(undefined, true)
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[Sheets API] Error response: ${res.status} - ${errText}`)
    
    let friendlyMessage = `Google Sheets API returned error: ${res.status}. `
    if (res.status === 401 || res.status === 403) {
      friendlyMessage += usingOAuth 
        ? "Your Google session may have expired or lacks sheets permission. Please Sign Out and Sign In again to refresh access." 
        : "Make sure the Google Sheet's access is configured so that 'Anyone with the link' can view/edit, or that your GOOGLE_API_KEY is valid.";
    } else if (res.status === 404) {
      friendlyMessage += "Spreadsheet not found. Please verify the URL or spreadsheet ID is correct.";
    } else {
      friendlyMessage += errText;
    }
    throw new Error(friendlyMessage)
  }

  const data = await res.json()
  const rows = data.values as string[][] | undefined

  if (!rows || rows.length === 0) {
    console.log("[Sheets API] Spreadsheet is empty or has no values.")
    return []
  }

  // Purely dynamic header mapping
  let startIdx = 0
  let nameIdx = -1
  let orgIdx = -1
  let emailIdx = -1
  let linkedinIdx = -1
  let roleIdx = -1

  // Scan the first few rows to find the header row
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    const isHeader = row.some((cell) => {
      const c = cell?.toLowerCase() || ""
      return (
        c === "name" || c.includes("first name") ||
        c.includes("email") ||
        c.includes("company") ||
        c.includes("linkedin") ||
        c.includes("title") || c.includes("role")
      )
    })
    
    if (isHeader) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx !== -1) {
    console.log(`[Sheets API] Header row detected at row ${headerRowIdx + 1}. Mapping column indices dynamically:`)
    startIdx = headerRowIdx + 1
    const headerRow = rows[headerRowIdx]

    headerRow.forEach((cell, idx) => {
      const c = cell?.toLowerCase().trim() || ""
      // Strict matching for Email so we don't catch "Email Link" as LinkedIn or vice versa
      if (c.includes("email") || c.includes("e-mail") || c === "mail") {
        emailIdx = idx
      } else if (c.includes("linkedin") || c.includes("social") || c === "link" || c.includes("profile")) {
        linkedinIdx = idx
      } else if (c.includes("name") || c.includes("prospect")) {
        nameIdx = idx
      } else if (c.includes("company") || c.includes("organization") || c.includes("org")) {
        orgIdx = idx
      } else if (c.includes("title") || c.includes("role") || c.includes("designation")) {
        roleIdx = idx
      }
    })
    console.log(`[Sheets API] Mapped: Name -> Col ${nameIdx}, Org -> Col ${orgIdx}, Email -> Col ${emailIdx}, LinkedIn -> Col ${linkedinIdx}, Role -> Col ${roleIdx}`)
  } else {
    console.log("[Sheets API] No explicit header row detected. Attempting to scan content for emails and links...")
    // If no header is found, fall back to scanning the first row of data to identify columns by content shape
    const sampleRow = rows[0] || []
    sampleRow.forEach((cell, idx) => {
      const c = cell?.toLowerCase().trim() || ""
      if (c.includes("@") && !c.includes("linkedin")) {
        emailIdx = idx
      } else if (c.includes("linkedin.com")) {
        linkedinIdx = idx
      } else if (nameIdx === -1 && c.length > 2 && !c.includes("@")) {
        nameIdx = idx
      } else if (orgIdx === -1 && nameIdx !== idx && c.length > 2 && !c.includes("@")) {
        orgIdx = idx
      }
    })
  }

  const contacts: SheetContact[] = []
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    
    // Only extract values if the column was successfully mapped
    const name = nameIdx !== -1 ? row[nameIdx]?.trim() || "" : ""
    const organization = orgIdx !== -1 ? row[orgIdx]?.trim() || "" : ""
    const email = emailIdx !== -1 ? row[emailIdx]?.trim() || "" : ""
    const linkedinLink = linkedinIdx !== -1 ? row[linkedinIdx]?.trim() || "" : ""
    const role = roleIdx !== -1 ? row[roleIdx]?.trim() || "" : ""

    // Accept row if it has a name, email, or organization — never silently drop a lead
    const hasEmail = !!email
    const hasName = !!name
    const hasOrg = !!organization
    
    if (hasEmail || hasName || hasOrg) {
      // If email is missing, generate a placeholder so the lead still appears
      const safeEmail = hasEmail ? email : `no-email-${i}-${(name || organization || "unknown").toLowerCase().replace(/\s+/g, "-")}@imported.local`
      contacts.push({ name: name || "Unknown", organization, email: safeEmail, linkedinLink, role })
    }
  }

  console.log(`[Sheets API] Successfully parsed ${contacts.length} valid contacts from Sheet.`)
  return contacts
}
