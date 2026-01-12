require("./utils/config")
const {db} = require("./db/drizzle")






// Use Prisma for type-safe SaleOrder operations
async function prismaQuery() {
  const result = await db.query.saleOrder.findFirst({
    where: (saleOrder, { eq }) => eq(saleOrder.id, 123),
    // This automatically joins the items table defined in our relations
    with: {
      items: true,
    },
  });


}


( async () => {
  await prismaQuery()

})()