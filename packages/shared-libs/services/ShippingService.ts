export class ShippingService {

    private db: any;

    constructor({db}: { db: any }) {
        this.db = db;
    }

    async calculateEta(now: Date){
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() + 7);

// Create 'to' date by adding 15 days
        const toDate = new Date(now);
        toDate.setDate(now.getDate() + 15);

        return {
            from: fromDate,
            to: toDate,
        }
    }

    async listShippingMethods(domainId :number ) {

        let connection

        try {
            connection = await this.db.getConnection();
            const [rows] = await connection.execute(
                `   select 
    mt.* , ifnull(IsEnabled, 0) as IsEnabled
from
    ShipmentMethodType mt
        left outer join
    ShipmentMethodConfiguration c ON mt.Id = c.ShipmentMethodTypeId  and mt.Id not in (4)
and c.DomainId = ? 
where  mt.Id not in (4) and  IsEnabled = 1
    
`, [domainId]);

            return rows;
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            if (connection)
                await connection.release();
        }
    }
}

// module.exports = ShippingService;