import {pool} from "../connections/mysql.js";


export const findWidget = async function(id, domainId) {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
            select *
            from webcontentconfiguration wcc
            where wcc.Id = ? and wcc.DomainId = ?
            order by Id desc;
 
`, [ id, domainId]
    );

    if(rows && rows.length > 0) {
      return rows[0]
    }

    return null;
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}

