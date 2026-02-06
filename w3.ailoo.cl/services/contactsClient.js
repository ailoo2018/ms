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

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
      return response.json();
  }


}

