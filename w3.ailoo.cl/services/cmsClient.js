const CMS_BASE_URL = process.env.CMS_URL;

const cmsClient = {
  getWcc: async (id, domainId) => {
    const url = new URL(`${domainId}/wcc/${id}`, CMS_BASE_URL);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5-second timeout
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
    return response.json();
  }
};


module.exports = cmsClient;