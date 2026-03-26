const CONTACTS_URL = process.env.CONTACTS_URL;

export const contactsClient = {

  index: async (contactId, domainId) => {
    const url = new URL("/index/" + domainId + "?partyIds=" + contactId, CONTACTS_URL);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Usually required for POST bodies
      }
    });

    if (!response.ok) {
      let errorDetail = ''

      try {
        const contentType = response.headers.get('content-type') ?? ''

        if (contentType.includes('application/json')) {
          const body = await response.json()
          // Different APIs use different fields
          errorDetail = body.message || body.error || body.detail || JSON.stringify(body)
        } else {
          // Plain text or HTML error page
          errorDetail = await response.text()
        }
      } catch {
        errorDetail = '(could not parse error body)'
      }

      throw new Error(
          `Contacts API error: ${response.status} ${response.statusText} — ${errorDetail} | url: ${url}`
      )
    }
    return response.json();
  }


}

