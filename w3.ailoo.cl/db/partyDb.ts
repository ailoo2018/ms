import {pool} from "../connections/mysql.js";


export const addPartyTag = async (partyId: number, tagId: number) => {
  const connection = await pool.getConnection();

  try {
    await connection.execute(
        `
      INSERT INTO PartyTag (PartyId, TagId)
      SELECT ?, ?
      FROM DUAL
      WHERE NOT EXISTS (
          SELECT 1 
          FROM PartyTag 
          WHERE PartyId = ? AND TagId = ?
      )
      `,
        [partyId, tagId, partyId, tagId] // Pass parameters for both the SELECT and the WHERE clause
    );
  } catch (error) {
    console.error("Error adding party tag:", error);
    throw error; // Re-throwing allows the caller to handle the failure
  } finally {
    connection.release();
  }
};

export const listPartyPostalAddresses = async partyId => {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
select cm.*, pcm.IsDefault, pcm.Purpose, gb.Name as ComunaName
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

export const listAddressesByOrders = async partyId => {
  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
          select pa.*,
                 comuna.Name  as ComunaName,
                 country.Name as CountryName,
                 country.Code as CountryCode
          from saleorder so
                 join postaladdress pa on so.ShippedToId = pa.PostalAddressId
                 left outer join geographicboundary comuna on pa.ComunaId = comuna.Id
                 left outer join geographicboundary country on pa.CountryId = comuna.Id
          where OrderedBy = ?;


`, [ partyId ]
    );


    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }


}