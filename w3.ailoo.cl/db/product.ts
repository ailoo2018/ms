import {pool} from "../connections/mysql.js";
import { RowDataPacket } from "mysql2"; // Optional: for better typing

export const productDescription = async function(productId) {

  const connection = await pool.getConnection();

  try {
    const [rows ] = await connection.execute<RowDataPacket[]>(
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

export const productComplements = async function(productId) {

    const connection = await pool.getConnection();

    try {
        const [rows ] = await connection.execute<RowDataPacket[]>(
            `
SELECT pass.ContainsId as ProductId
FROM productassociation pass
WHERE PartOfId = ?

UNION

SELECT pass.PartOfId as ProductId
FROM productassociation pass
WHERE ContainsId = ?

UNION


SELECT pfa.ProductId 
FROM Product p
         JOIN ProductFacet pf ON p.Id = pf.ProductId
         JOIN Facet f1 ON f1.Id = pf.FacetId
         JOIN ProductFacetAssociation pfa ON pf.FacetId = pfa.FacetId
         JOIN ProductFacetAssociation pfa2 ON pfa.ProductId = pfa2.ProductId
         JOIN Facet f2 ON f2.Id = pfa2.FacetId
WHERE p.Id = ?
GROUP BY pfa.ProductId
HAVING COUNT(DISTINCT f1.Type) >= COUNT(DISTINCT f2.Type);

            
`, [ productId, productId, productId ]);

        if(rows.length > 0) {
            return rows.filter(r1 => r1.ProductId > 0).map(r => r.ProductId)
        }

        return [];
    } catch (error) {
        console.log(error);
        throw error
    } finally {
        await connection.release();
    }

}

