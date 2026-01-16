const { pool } = require("../db");

module.exports.listPartyPostalAddresses = async partyId => {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
select cm.*, pcm.Purpose
from 
    postaladdress cm
    join partycontactmechanism pcm on pcm.ContactMechanismId = cm.PostalAddressId
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