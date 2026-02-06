import type {PaymentValidation, PaymentValidator} from "../clients/paymentValidator";
import  {validateInvoice, validateOrder, ValidationType} from "./confirm.payments.t.ts";
import { ordersHelper} from "../services/ordersService.js";
import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";

import container from "../container/index.ts";

import {PaymentMethodType} from "../models/domain.js";

const paymentValidator : PaymentValidator = container.resolve("mercadoPagoValidator")




export async function confirmMercadoPagoPayment(paymentId : string, validationType: number, domainId: number) : Promise<PaymentValidation> {

  const response : PaymentValidation = await paymentValidator.validate(paymentId, PaymentMethodType.Webpay, domainId);


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

