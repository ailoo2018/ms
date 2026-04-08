import {pool} from "../connections/mysql.js";

export interface OrderContactMechanisms {
    phones: string[];
    emails: string[];
}


export const listClientContactMechanisms = async (orderId: number) : Promise<OrderContactMechanisms> => {

    const connection = await pool.getConnection();

    try {
        const [ rows ] = await connection.execute(
            `

                select so.Id,
                       so.OrderedBy,
                       so.State,
                       p.Id,
                       p.Email as Email1,
                       p.Phone as Phone1,
                       pa.Email as Email2,
                       pa.Phone as Phone2
                from saleorder so
                         left join party p on p.Id = so.OrderedBy
                         left outer join PostalAddress pa on pa.PostalAddressId = so.ShippedToId
                where so.DomainId = 1
                  and so.Id = ?
                order by so.Id desc;

`, [ orderId ]
        );

        let rs = rows as any;

        const result : OrderContactMechanisms = {
            phones: [],
            emails: [],
        }
        if(rs.length > 0){
            for(var r of rs){
                if(r.Phone1 && r.Phone1.length > 0){
                    result.phones.push(normalizeChileanPhone( r.Phone1));
                }
                if(r.Phone2 && r.Phone2.length > 0 && r.Phone2 !== r.Phone1){
                    result.phones.push(normalizeChileanPhone( r.Phone2));
                }

                if(r.Email1 && r.Email1.length > 0){
                    result.emails.push(r.Email1.toLowerCase());
                }
                if(r.Email2 && r.Email2.length > 0 && r.Email2 !== r.Email2){
                    result.emails.push(r.Email2.toLowerCase());
                }

            }
        }



        return result;
    } catch (error) {
        console.log(error);
    } finally {
        await connection.release();
    }

}


/**
 * Normalizes phone numbers to the format: 569XXXXXXXX
 * @param {string|number} phone - The raw phone string or number
 * @returns {string} The normalized 11-digit phone number
 */
function normalizeChileanPhone(phone) {
    // 1. Convert to string and remove all non-numeric characters (spaces, dashes, etc.)
    let cleaned = String(phone).replace(/\D/g, '');

    // 2. Logic for Chilean mobile numbers:
    // If it's 9 digits (e.g., 990025113), prepend the country code '56'
    if (cleaned.length === 9) {
        return `56${cleaned}`;
    }

    // If it's already 11 digits and starts with 56, return as is
    if (cleaned.length === 11 && cleaned.startsWith('56')) {
        return cleaned;
    }

    // If it's 8 digits (old format), prepend '569'
    if (cleaned.length === 8) {
        return `569${cleaned}`;
    }

    return cleaned;
}

