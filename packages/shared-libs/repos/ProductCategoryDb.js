"use strict";



function mapDbRow(r, parent){
    return {
        id: r.CategoryId,
        depth: parent.depth + 1,
        name: r.CategoryName,
        image: r.CategoryImage,
        linkName: r.LinkName,
        description: r.CategoryDescription,
        parent: { id: parent.id, name: parent.name, parent: parent.parent},
        orderWeight: r.OrderWeight,
        isDeleted: r.Deleted,
        count: 0,
        config: r.Config,
        isAvailableForInternet: r.IsAvailableForInternet,
        modifiedDate: r.ModifiedDate ? new Date(r.ModifiedDate) : new Date(1990, 0, 1),
        googleProductCategory: r.GoogleProductCategory,
        fbkProductCategory: r.FbkProductCategory
    };
}



class ProductCategoryDb {


    constructor({ db}) {
        this.db = db
    }

    createTree = async function(domainId) {

        const connection = await this.db.pool.getConnection();

        try {
            const [rows, fields] = await connection.execute(
                `   select
        concat(pc.Id, '-', ifnull(ParentId,0)) as Llave,
    pc.Id as CategoryId,
        pc.ModifiedDate,
        pc.CategoryImage,
        pc.Deleted,
        pc.OrderWeight,
        ifnull(pcr.ParentId, 0) ParentId,
        pc.Description as CategoryName,
        pc.Content as CategoryDescription,
        pc.IsAvailableForInternet,
        pc.GoogleProductCategory,
        pc.FbkProductCategory,
        pc.LinkName,
        pc.Config
    from ProductCategory pc
        left outer join ProductCategoryRollup pcr on pc.Id = pcr.ChildId
    where
        pc.DomainId = ? and pc.Deleted = 0
    group by pc.Id, pcr.ParentId, pcr.ChildId    
    order by pc.OrderWeight
`, [domainId]
            );

            const root = { id: 0, name: "Root", depth:0, count:0, children: [], parent: null};

            const asRows = [];
            createTree(root, rows, domainId,  {},false, asRows)

            return {root, asRows};
        } catch (error) {
            console.log(error);
        } finally {
            await connection.release();
        }
    }


    searchCategory = async function (sword, domainId) {

        const connection = await this.db.pool.getConnection();
        try {
            const query = `
            SELECT * 
            FROM productcategory 
            WHERE DomainId = ? AND Deleted = 0 AND Description LIKE ?;
        `;
            const [rows] = await connection.execute(query, [domainId, `%${sword}%`]);
            return rows;
        } catch (err) {
            console.error('Error searching category:', err);
            throw err;
        }finally {
            await connection.release();
        }
    };

    findAllByDomainId = async function(domainId) {

        const connection = await this.db.pool.getConnection();

        try {
            const [rows, fields] = await connection.execute(
                `   select
        pc.Id as Id,
        pc.ModifiedDate,
        pc.CategoryImage,
        pc.Deleted,
        pc.OrderWeight,
        pc.Description as CategoryName,
        pc.Content as CategoryDescription,
        pc.IsAvailableForInternet,
        pc.GoogleProductCategory,
        pc.FbkProductCategory,
        pc.LinkName
    from ProductCategory pc
      
    where
        pc.DomainId = ? and pc.Deleted = 0
   
`, [domainId]
            );

            return (rows);
        } catch (error) {
            console.log(error);
        } finally {
            await connection.release();
        }
    }
}


function createTree(parent, cats, domainId, mapCount, onlyWithItems, asRows) {
    const children = cats.filter(c =>
        ((onlyWithItems && getCount(c.CategoryId, mapCount) > 0) || !onlyWithItems)
        && c.ParentId === parent.id
        && c.Deleted == 0
        && (c.CategoryName !== "Contabilidad" || domainId === 1)
    ).map(r => {
        return mapDbRow(r, parent);
    }).sort((c1, c2) => c1.orderWeight - c2.orderWeight || c1.name.localeCompare(c2.name));

    if(parent.children == null)
        parent.children =[];


    if (children.length > 0) {
        asRows.push(...children);
        parent.children.push(...children);
    }


    for (const child of parent.children) {
        createTree(child, cats, domainId, mapCount, onlyWithItems, asRows);
        if(child.children == null || child.children.length == 0)
            child.isLeaf = true;
        else
            child.isLeaf = false;
    }

    return parent;
}





module.exports.ProductCategoryDb = ProductCategoryDb

