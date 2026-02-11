
export interface PaymentValidation {
    responseCode?: string;
    success: boolean;
    referenceId: string;
    referenceType: string;
    responseData: any;
    transactionAmount: number;
    currency?: string;
    authorizationCode: string;
    paymentMethodId: number;
    transactionDate: Date;
}

export interface PaymentValidator {
    validate(token: any, paymentMethodType: number, domainId: number): Promise<PaymentValidation>;
}


