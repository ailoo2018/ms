
export interface PaymentValidation {
    responseCode?: string;
    success: boolean;
    referenceId: string;
    responseData: any;
    transactionAmount: number;
    authorizationCode: string;

}

export interface PaymentValidator {
    validate(token: any, paymentMethodType: number, domainId: number): Promise<PaymentValidation>;
}


