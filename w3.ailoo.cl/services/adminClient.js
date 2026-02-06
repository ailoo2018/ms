import logger from "@ailoo/shared-libs/logger";

const ADMIN_URL = process.env.ADMIN_URL
const AILOO_ACCESS_TOKEN = process.env.AILOO_ACCESS_TOKEN
const AILOO_FACILITY_ID = 479 // bodega online
const AILOO_CASH_REGISTER_ID= 1211

export const adminClient = {

  paymentValidated: async (orderId, authcode, domainId) =>
  {
    const url = new URL(`/InternetOrders/PaymentValidated.rails`, ADMIN_URL);

    logger.info("Validate payment in admin: " + ADMIN_URL + `/InternetOrders/PaymentValidated.rails` + AILOO_ACCESS_TOKEN);

    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(5000), // 5-second timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Ailoo-Access-Token': AILOO_ACCESS_TOKEN,
        'X-Ailoo-Access-FacilityId': AILOO_FACILITY_ID,
        'X-Ailoo-Access-CashRegisterId' : AILOO_CASH_REGISTER_ID,
      },
      body: JSON.stringify({
        orderId: orderId,
        authcode: authcode,
      }),
    });

    if (!response.ok){
      const errorHtml = await response.text();

      logger.error(`Error al llamar PaymentValidation. Status: ${response.status}`);
      logger.error(`Server Response Body: ${errorHtml}`); // This logs the HTML

      throw new Error(`ADMIN Error: ${response.status}`);    }

    var res = await response.json();
    console.log("Result PaymentValidation: " + JSON.stringify(res));
    return res
  }


}

