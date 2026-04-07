
export interface PaymentValidation {
    message?: string;
    responseCode?: string;
    success: boolean;
    referenceId: string;
    referenceType: string;
    responseData: any;
    transactionAmount: number;
    currency?: string;
    authorizationCode: string;
    paymentMethodId: number;
    transactionDate?: Date;
    status?: string;
}

export interface PaymentValidator {
    validate(token: any, paymentMethodType: number, domainId: number): Promise<PaymentValidation>;
}


