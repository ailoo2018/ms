const {pool} = require("../connections/mysql");


module.exports.productStock = async function (id, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
        `
            select pit.Id as productItemId,
                   sum(if(Quantity < 0, 0, Quantity)) as quantity
            from InventoryItem ii
                     join Facility f on f.Id = ii.FacilityId
                     join ProductItem pit on pit.Id = ii.ProductItemId
            where f.Type in (0, 2, 4, 7)
              and f.IsAvailableForInternet = 1
              and pit.Deleted = 0
              and pit.ProductId = ?
              and f.DomainId = ?
            group by pit.Id;
`, [id, domainId]);


    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}

module.exports.stockByStore = async function (facilityId, productItemIds, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
        `   select ii.Id, ii.ProductItemId, ii.Quantity, f.Id as FacilityId, f.Name as FacilityName
    from InventoryItem ii
    join Facility f on ii.FacilityId = f.Id
    where ii.FacilityId = ?
    and ii.ProductItemId in (?)
    and f.DomainId = ?
    
`, [facilityId, productItemIds, domainId]);

    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}

module.exports.stockAllStores = async function (productItemId, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
        `  select f.Id   as FacilityId,
       f.Name as FacilityName,
       ii.Id     InventoryItemId,
       ii.ProductItemId,
       sum(ifnull(ii.Quantity, 0)) as Quantity,
       pa.Address,
       pa.ComunaId,
       gb.Name ComunaName
from InventoryItem ii
         join Facility f on ii.FacilityId = f.Id
         join FacilityContactMechanism fcm on f.Id = fcm.FacilityId
         join PostalAddress pa on fcm.ContactMechanismId = pa.PostalAddressId
        join GeographicBoundary gb on gb.Id = pa.ComunaId
       
where f.AllowPickup = 1 and f.Type = 0
  and ii.ProductItemId in (?)
  and f.DomainId = ? group by f.Id;


    
`, [productItemId, domainId]);

    return rows;
  } catch (error) {
    console.log(error);

    throw(error)
  } finally {
    await connection.release();
  }

}