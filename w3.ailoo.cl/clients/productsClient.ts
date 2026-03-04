

const PRODS_URL = process.env.PRODUCTS_MS_URL;


export const productsClient = {

    createImageSizes: async (imageId, sizes, maintainAspectRatio , domainId) =>
    {
        const url = new URL(`/${domainId}/images/sizes`, PRODS_URL);
        const response = await fetch(`${url}`, {
            method: 'POST',
            signal: AbortSignal.timeout(30000) as any, // 5-second timeout
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageId,
                sizes
            })

        });

        if (!response.ok){
            console.log(response.text());
            throw new Error(`PROD_URL Error: ${response.status} ${url.toString()}`);
        }


        return await response.json()
    }
}