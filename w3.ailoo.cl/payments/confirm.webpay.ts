import type {PaymentValidation, PaymentValidator} from "../clients/paymentValidator";
import {validateInvoice, validateOrder, ValidationType} from "../payments/confirm.payments.t.ts";
import container from "../container/index.ts";

import {PaymentMethodType} from "../models/domain.js";




export async function confirmWebPay(token : string, validationType: number, domainId: number) : Promise<PaymentValidation> {

  const paymentValidator : PaymentValidator = container.resolve("webPayValidator")
  const response : PaymentValidation = await paymentValidator.validate(token, PaymentMethodType.Webpay, domainId);


  if(!response.success){
    throw new Error(`Transaccion rechazada ${response.responseCode}`)
  }

  if(validationType === ValidationType.Invoice) {
    await validateInvoice(response.referenceId, response.transactionAmount, domainId)
  }else{
    await validateOrder(response.referenceId, response.transactionAmount, domainId)
  }

  return response
}






