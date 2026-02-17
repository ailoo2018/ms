const BIKE_BASE_URL = "https://motorbike.ailoo.cl"; // process.env.CMS_URL;

export const bikeClient = {


  listBrands: async (filterBikeWithProducts) => {
    const url = new URL(`/brands?filterBikeWithProducts=` + filterBikeWithProducts, BIKE_BASE_URL);

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
  listModels: async (brandId, filterBikeWithProducts) => {
    const url = new URL(`/brands/${brandId}/models?filterBikeWithProducts=` + filterBikeWithProducts, BIKE_BASE_URL);

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

  listYears: async (modelId, brandId, filterBikeWithProducts) => {
    const url = new URL(`/brands/${brandId}/models/${modelId}/years?filterBikeWithProducts=` + filterBikeWithProducts, BIKE_BASE_URL);

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



