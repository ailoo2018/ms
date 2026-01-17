const {pool} = require("./index");


  module.exports.productDescription = async function(productId) {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute(
        `
            select Description from Product where Id = ?
`, [ productId ]);

    if(rows.length > 0) {
      return rows[0].Description
    }

    return "";
  } catch (error) {
    console.log(error);
  } finally {
    await connection.release();
  }

}

