const CMS_BASE_URL = process.env.CMS_URL;

const cmsClient = {
  getWcc: async (id, domainId) => {
    const url = new URL(`${domainId}/wcc/${id}`, CMS_BASE_URL);

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
  search: async (query, domainId) => {
    const url = new URL(`${domainId}/blog/search`, CMS_BASE_URL);

    const response = await fetch(url, {
      method: "POST",// 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json' // Usually required for POST bodies
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) throw new Error(`CMS Error: ${response.status}`);
    return response.json();
  },

  searchEvents: async (criteria, domainId) => {
    const url = CMS_BASE_URL + `/${domainId}/events/search`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json' // Usually required for POST bodies
        },
        body: JSON.stringify(criteria), // Ensure criteria is a string if it's an object
      });

      if (!response.ok) {
        // 1. Capture the raw error body from the CMS
        const errorText = await response.text();
        let errorDetail;

        try {
          errorDetail = JSON.parse(errorText);
        } catch (e) {
          errorDetail = errorText; // Not JSON, use raw text
        }

        // 2. Log the detailed report
        console.error("---------- CMS SEARCH ERROR ----------");
        console.error(`URL: ${url}`);
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error(`Payload:`, criteria);
        console.error(`Response:`, errorDetail);
        console.error("--------------------------------------");

        throw new Error(`CMS Error [${response.status}]: ${JSON.stringify(errorDetail)}`);
      }

      return await response.json();

    } catch (err) {
      // This catches network failures (DNS, timeout) or the Error thrown above
      console.error("Fatal Fetch Error:", err.message);
      throw err;
    }
  },

  getNuxtComponent(w) {
    if (w.name === "Html_CarruselMotocard") {
      return "Swiper"
    }
    if (w.name === "Html_ClickAndCollect") {
      return "ScrollingText"
    }
    if (w.name === "Html_BikeSearchBlock") {
      return "BikeSearch"
    }
    if (w.name === "Html_AddedValuesMotocard") {
      return "AddedValues"
    }
    if (w.name === "Html_SingleBanner") {
      return "SingleBanner"
    }

    if (w.name === "HomeCategoriesLifeStyle") {
      return "HomeCategories"
    }
    if (w.name === "Html_ProductListMotocard") {
      return "FeaturedProducts"
    }

    if (w.name === "Html_CategoriesMtcrd") {
      return "HomeCategories"
    }

    if (w.name === "Html_BrandsBlock") {
      return "BrandsBlock"
    }

    if (w.name === "Html_ProductListWithBanner") {
      return "FeaturedProductsWithBanner"
    }
    if (w.name === "Html_Comunidad") {
      return "Community"
    }
    if (w.name === "EventsWidget") {
      return "LatestEvents"
    }

    if(w.name === "HomeCategoriesCafeRacer"){
      return "CafeRacerCategories";
    }
    if(w.name === "OffRoadCategories"){
      return "OffRoadCategories";
    }

    if(w.name === "Html_BrandsBlock_CafeRacer"){
      return "CafeRacerBrandsBlock"
    }
    if(w.name === "Html_BrandsBlock_MX"){
      return "BrandsBlockMx"
    }

    if (w.name === "Seo") {
      return "Seo"
    }
    if (w.name === "Html") {
      return "HtmlWidget"
    }
    if (w.name === "YoutubeLatest") {
      return "YoutubeLatest"
    }


    return "Dummy"
  }


};


module.exports = cmsClient;