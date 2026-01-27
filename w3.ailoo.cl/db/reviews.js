const {pool} = require("../connections/mysql");


module.exports.partyReviews = async function (partyId, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
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
and pty.Id = ?`, [partyId]);


    return rows;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}


module.exports.listReviews = async function (rq, domainId) {
  const connection = await pool.getConnection();

  try {
    const limit = parseInt(rq.limit) || 10;
    const offset = parseInt(rq.offset) || 0;
    const productId = parseInt(rq.productId);

    // 1. Safe Rating Logic
    let ratingSql = "";
    const ratingMap = {
      5: "(9, 10)",
      4: "(7, 8)",
      3: "(5, 6)",
      2: "(3, 4)",
      1: "(1, 2)"
    };
    if (rq.rating && ratingMap[rq.rating]) {
      ratingSql = ` AND r.Rating in ${ratingMap[rq.rating]} `;
    }

    // 2. DEFEND AGAINST SQL INJECTION (Whitelist)
    const allowedSortColumns = ['Date', 'Rating', 'Likes'];
    const sortColumn = allowedSortColumns.includes(rq.orderBy) ? rq.orderBy : 'Date';
    const sortDir = rq.orderDir?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const sql = `
      SELECT r.Id, r.Comments as Comment, r.Rating, r.Date, r.Likes, r.Dislikes,
             m.id as ModelId, m.name as ModelName, u.Id as UserId, u.Username,
             pty.Id as PartyId, pty.Name as PartyName
      FROM Review as r
      JOIN User u ON r.UserId = u.Id
      JOIN product p ON r.ProductId = p.Id
      LEFT OUTER JOIN model m ON p.ModelId = m.Id
      LEFT OUTER JOIN Party pty ON pty.Id = u.PersonId
      WHERE r.DomainId = ?
        AND r.IsEvaluation = 1
        AND r.State = 2
        AND r.ProductId = ?
        ${ratingSql}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${offset}, ${limit}`;

    const [rows] = await connection.execute(sql, [domainId, productId]);
    return rows;

  } catch (error) {
    console.error("Database Error:", error);
    throw error; // Re-throw so the API caller knows something went wrong
  } finally {
    await connection.release();
  }
};
