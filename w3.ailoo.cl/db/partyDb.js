import {pool} from "../connections/mysql.js";


export const listPartyPostalAddresses = async partyId => {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
select cm.*, pcm.Purpose, gb.Name as ComunaName
from 
    postaladdress cm
    join partycontactmechanism pcm on pcm.ContactMechanismId = cm.PostalAddressId
    left outer join geographicboundary gb on cm.ComunaId = gb.Id
where pcm.PartyId = ?
order by 
    pcm.IsDefault desc, 
    cm.PostalAddressId desc`, [ partyId ]
    );


    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}