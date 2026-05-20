export interface SentEmail {
  id: string
  threadId: string
  recipient: string
  subject: string
  date: string
  threadLink: string
}

export interface ThreadReplyStatus {
  replied: boolean
  lastReply: string | null
}

/**
 * Fetch the user's primary email address from the Gmail Profile API
 */
export async function getGmailProfile(accessToken: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  })
  if (!res.ok) {
    throw new Error(`Gmail profile fetch failed: ${res.statusText}`)
  }
  const data = await res.json()
  return data.emailAddress || ""
}

/**
 * Fetch sent emails from the Gmail API (messages with SENT label)
 */
export async function getSentEmails(accessToken: string): Promise<SentEmail[]> {
  try {
    const listRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=500",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      }
    )

    if (!listRes.ok) {
      if (listRes.status === 401) {
        throw new Error("Gmail API Access Token expired or unauthorized.")
      }
      throw new Error(`Gmail messages fetch failed: ${listRes.statusText}`)
    }

    const listData = await listRes.json()
    const messages = listData.messages || []
    
    const sentEmails: SentEmail[] = []

    // Fetch details for each message in parallel
    const detailPromises = messages.map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json"
            }
          }
        )
        if (!detailRes.ok) return null

        const detail = await detailRes.json()
        const headers = detail.payload?.headers || []
        
        const toHeader = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "Unknown Recipient"
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)"
        
        // Extract clean recipient email if in "Name <email@domain.com>" format
        const recipientEmail = toHeader.match(/<([^>]+)>/)?.[1] || toHeader

        const dateMs = parseInt(detail.internalDate, 10)
        const dateStr = !isNaN(dateMs) ? new Date(dateMs).toISOString() : new Date().toISOString()

        return {
          id: msg.id,
          threadId: msg.threadId,
          recipient: recipientEmail.trim(),
          subject: subjectHeader.trim(),
          date: dateStr,
          threadLink: `https://mail.google.com/mail/u/0/#all/${msg.threadId}`
        }
      } catch (err) {
        console.error(`Error fetching message details for ${msg.id}:`, err)
        return null
      }
    })

    const results = await Promise.all(detailPromises)
    for (const r of results) {
      if (r) sentEmails.push(r)
    }

    return sentEmails
  } catch (err: any) {
    console.error("Failed fetching sent emails from Gmail:", err.message)
    throw err
  }
}

/**
 * Check if a reply exists from a recipient on the given thread
 */
export async function checkThreadReplies(accessToken: string, threadId: string): Promise<ThreadReplyStatus> {
  try {
    // 1. Get the authenticated user's email address
    const userEmail = await getGmailProfile(accessToken).catch(() => "")
    const normalizedUserEmail = userEmail.toLowerCase()

    // 2. Fetch the thread details
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    })

    if (!res.ok) {
      throw new Error(`Gmail thread fetch failed: ${res.statusText}`)
    }

    const data = await res.json()
    const messages = data.messages || []

    // 3. Find replies (messages NOT sent by the authenticated user)
    const replies = messages.filter((msg: any) => {
      const headers = msg.payload?.headers || []
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || ""
      const senderEmail = fromHeader.match(/<([^>]+)>/)?.[1] || fromHeader
      
      // If we couldn't get a valid profile, fall back to matching SENT label exclusion
      const hasSentLabel = msg.labelIds?.includes("SENT")

      if (normalizedUserEmail) {
        return senderEmail.trim().toLowerCase() !== normalizedUserEmail
      } else {
        return !hasSentLabel
      }
    })

    if (replies.length === 0) {
      return { replied: false, lastReply: null }
    }

    // 4. Find the latest reply timestamp
    let latestReplyMs = 0
    for (const rep of replies) {
      const ms = parseInt(rep.internalDate, 10)
      if (!isNaN(ms) && ms > latestReplyMs) {
        latestReplyMs = ms
      }
    }

    return {
      replied: true,
      lastReply: latestReplyMs > 0 ? new Date(latestReplyMs).toISOString() : new Date().toISOString()
    }
  } catch (err: any) {
    console.error(`Failed checking thread replies for thread ${threadId}:`, err.message)
    return { replied: false, lastReply: null }
  }
}
