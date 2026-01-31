export declare class ShippingService {
    private db;
    constructor({ db }: {
        db: any;
    });
    listShippingMethods(domainId: number): Promise<any>;
}
