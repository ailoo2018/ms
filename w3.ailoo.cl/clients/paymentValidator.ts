
export interface PaymentValidation {
    responseCode?: string;
    success: boolean;
    referenceId: string;
    referenceType: string;
    responseData: any;
    transactionAmount: number;
    authorizationCode: string;
    paymentMethodId: number;

}

export interface PaymentValidator {
    validate(token: any, paymentMethodType: number, domainId: number): Promise<PaymentValidation>;
}


