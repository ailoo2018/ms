const {pool} = require("../connections/mysql");



module.exports.partyReviews = async function(partyId, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
   select p.*, i.Id as InvoiceId from Invoice i 
join Party pty on i.ReceivedById = pty.Id
join User u on u.PersonId = pty.Id
join InvoiceItem ii on i.Id = ii.InvoiceId
join ProductItem p on p.Id = ii.ProductItemId
join Product prod on prod.Id = p.ProductId
left outer join Review r on p.ProductId = r.ProductId and r.UserId = u.Id
where i.Deleted = 0 and i.SaleTypeId in (1,3)
and prod.Deleted = 0
and r.Id is null
and pty.Id = ?`, [ partyId ]);



    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}

