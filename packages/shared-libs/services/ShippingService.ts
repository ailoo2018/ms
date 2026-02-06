export class ShippingService {

    private db: any;

    constructor({db}: { db: any }) {
        this.db = db;
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