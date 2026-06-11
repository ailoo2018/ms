import logger from "@ailoo/shared-libs/logger";

const ADMIN_URL =  process.env.ADMIN_URL
const AILOO_ACCESS_TOKEN = process.env.AILOO_ACCESS_TOKEN

export const adminClient = {

    analyzeSale: async (context: any, domainId: number) => {
        const url = `${ADMIN_URL}/Pos/AnalyzeSale.rails`;



        const response = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(30000) as any, // 5-second timeout
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',

            },
            body: JSON.stringify(context)

        });

        if (!response.ok){
            const errorHtml = await response.text();

            logger.error(`Error al analizar compra. Status: ${response.status}`);
            logger.error(`Server Response Body: ${errorHtml}`); // This logs the HTML

            throw new Error(`ADMIN Error: url ${url} ${response.status}: ${errorHtml}`);    }

        return await response.json();
    },



}

