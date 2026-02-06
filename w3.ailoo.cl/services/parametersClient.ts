const PARAM_BASE_URL = process.env.PARAMETERS_URL || 'https://parameters.ailoo.cl';

const parametersClient = {

  getParameter: async (category, key, domainId) => {
    const url = new URL(`/parameter/${domainId}/${category}/${key}`, PARAM_BASE_URL);

    const response = await fetch(url, {
      method: "GET",// 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Usually required for POST bodies
      },
    });

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
    return response.json();
  },

};

export default parametersClient;