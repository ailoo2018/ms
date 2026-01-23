const BIKE_BASE_URL = "https://motorbike.ailoo.cl"; // process.env.CMS_URL;

const bikeClient = {


  listBrands: async () => {
    const url = new URL(`/brands?filterBikeWithProducts=true`, BIKE_BASE_URL);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Usually required for POST bodies
      }
    });

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
    return response.json();
  },
  listModels: async (brandId) => {
    const url = new URL(`/brands/${brandId}/models?filterBikeWithProducts=true`, BIKE_BASE_URL);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Usually required for POST bodies
      }
    });

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
    return response.json();
  },

  listYears: async (modelId, brandId) => {
    const url = new URL(`/brands/${brandId}/models/${modelId}/years?filterBikeWithProducts=true`, BIKE_BASE_URL);

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



module.exports = bikeClient;