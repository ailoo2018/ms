export interface PaypalCaptureResponse {
    error_description: string;
    error: string | undefined;
    id: string; // The PayPal Order ID
    status: 'COMPLETED'     | 'SAVED' | 'APPROVED' | 'VOIDED' | 'PAYER_ACTION_REQUIRED';
    payment_source?: {
        paypal: {
            email_address: string;
            account_id: string;
        };
    };
    purchase_units: PaypalPurchaseUnit[];
    payer: PaypalPayer;
    links: PaypalLink[];
}

interface PaypalPurchaseUnit {
    reference_id: string;
    invoice_id?: string;
    shipping?: {
        name: { full_name: string };
        address: PaypalAddress;
    };
    payments: {
        captures: PaypalCapture[];
    };
}

interface PaypalCapture {
    id: string; // The Transaction ID (for refunds)
    invoice_id?: string;
    status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
    amount: PaypalAmount;
    final_capture: boolean;
    seller_protection: {
        status: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE';
    };
    seller_receivable_breakdown: {
        gross_amount: PaypalAmount;
        paypal_fee: PaypalAmount;
        net_amount: PaypalAmount;
    };
    links: PaypalLink[];
}

interface PaypalPayer {
    name: { given_name: string; surname: string };
    email_address: string;
    payer_id: string;
    address: { country_code: string };
}

interface PaypalAddress {
    address_line_1: string;
    address_line_2?: string;
    admin_area_2: string; // City
    admin_area_1: string; // State/Province
    postal_code: string;
    country_code: string;
}

interface PaypalAmount {
    currency_code: string;
    value: string; // PayPal returns strings for currency values
}

interface PaypalLink {
    href: string;
    rel: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}