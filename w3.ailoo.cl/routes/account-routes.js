const {app, validateJWT, upload, reviewsUpload} = require("../server");
const {listPartyPostalAddresses} = require("../db/partyDb");
const {db: drizzleDb} = require("../db/drizzle");
const {and, eq, asc} = require("drizzle-orm");
const {saleOrder} = require("../db/schema.ts");
const {partyReviews} = require("../db/reviews");
const container = require("../container");
const {uploadImagesAilooCDN} = require("../services/cdnService");
const {review, postalAddress, geographicBoundary} = require("../db/schema.ts");
const domain = require("node:domain");

const productService = container.resolve('productsService');

/**
 * Parses a full name into first name, paternal, and maternal surnames.
 * @param {string} fullName
 * @returns {object}
 */
const parseFullName = (fullName) => {
  // Handle null, undefined, or empty/whitespace input
  if (!fullName || !fullName.trim()) {
    return {
      firstName: "",
      paternalSurname: "",
      maternalSurname: ""
    };
  }

  // Split by whitespace and remove empty entries
  const nameParts = fullName.trim().split(/\s+/);

  // Case 1: Single word name
  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      paternalSurname: "",
      maternalSurname: ""
    };
  }

  // Case 2: 4 or more parts (Hispanic names)
  // First name is everything except the last two parts
  if (nameParts.length >= 4) {
    return {
      firstName: nameParts.slice(0, -2).join(" "),
      paternalSurname: nameParts[nameParts.length - 2],
      maternalSurname: nameParts[nameParts.length - 1]
    };
  }

  // Case 3: 3 parts (e.g., "Juan Carlos Fuentes")
  if (nameParts.length === 3) {
    return {
      firstName: nameParts.slice(0, 2).join(" "),
      paternalSurname: nameParts[2],
      maternalSurname: ""
    };
  }

  // Case 4: 2 parts (First Name + Paternal Surname)
  return {
    firstName: nameParts[0],
    paternalSurname: nameParts[1],
    maternalSurname: ""
  };
};

const OrderStateDesc = {
  "0": "Desconocido",
  "1": "Ingresado",
  "2": "Pagado",
  "3": "Enviado",
  "4": "Anulado",
  "5": "Pendiente Pago",
  "6": "Abierto",
  "7": "Rechazado",
  "8": "Listo Para Retiro",
  "9": "Retirado",
  "10": "Entregado",
  "11": "Error Pago",
  "12": "Listo para enviar",
  "13": "Comentario",
  "14": "Derivado a SAC",
  "15": "En proceso",
}

app.get("/:domainId/account/latest-orders", validateJWT, async (req, res, next) => {
  try {
    const user = req.user;
    const domainId = parseInt(req.params.domainId);
    const results = await drizzleDb.query.saleOrder.findMany({
      limit: 10,
      offset: 0,
      where: and(
          eq(saleOrder.orderedBy, user.id),
          eq(saleOrder.domainId, domainId)
      )
      ,
      orderBy: (saleOrder, {asc}) => [asc(saleOrder.id)],
      with: {
        items: true, // This matches the 'items' key in your saleOrderRelations
      },
    });

    res.json({
      orders: results.map(r => {
        return {
          id: r.id,
          date: r.date,
          total: 0,
          statusId: r.state,
          status: OrderStateDesc["" + r.state] ? OrderStateDesc["" + r.state] : "Desconocido",

        }
      })
    })
  } catch (err) {
    next(err);
  }
});

app.get("/:domainId/account/addresses", validateJWT, async (req, res, next) => {

  try {
    const user = req.user;

    const addresses = await listPartyPostalAddresses(user.partyId)

    res.json({
      addresses: addresses.map(addr => {

        const nameObj = parseFullName(addr.Name);

        return {
          "id": addr.PostalAddressId,
          "default": true,
          "comuna_id": addr.ComunaId || 0,
          "address": addr.Address || null,
          "phone": addr.Phone || null,
          "nif": addr.Rut || null,
          "name": nameObj.firstName,
          "surnames": nameObj.paternalSurname,
          "postal_code": addr.PostalCode || null,
          "address2": addr.Address2 || null,
          "alias": addr.Alias || null,
          "type": "shipping",
          "comuna": {
            "id": addr.ComunaId,
            "name": "NOT AVAL"
          },
          "rut": addr.Rut || null,
        }
      }),
    });
  } catch (err) {
    next(err)
  }

})

app.get("/:domainId/account/user", validateJWT, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await drizzleDb.query.user.findFirst({
      where: (user, {eq}) => eq(user.id, userId),
      // Use 'with' if you need the linked Party (Person) data too
      with: {
        person: true
      }
    });

    res.json(result)
  } catch (err) {
    next(err);
  }
})

app.get("/:domainId/account/reviews", validateJWT, async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const userId = req.user.id;

    const userDb = await drizzleDb.query.user.findFirst({
      where: (user, {eq}) => eq(user.id, userId),
      with: {
        person: true
      }
    })

    const rows = await partyReviews(userDb.personId, domainId)


    const productService = container.resolve('productsService');
    var products = await productService.findProducts(rows.map(r => r.ProductId), domainId)

    res.json({
      reviews: rows.map(r => {
        const product = products.find(p => r.ProductId === p.id)

        return {
          product: product || null,
          invoiceId: r.InvoiceId,
          productItemId: r.Id,

        }
      })
    })

  } catch (e) {
    next(e)
  }
})

app.post("/:domainId/account/reviews/add", validateJWT, reviewsUpload,
    async (req, res, next) => {
      try {
        const {domainId} = req.params;
        const {productItemId, productId, rating, title, comment, videoUrl, invoiceId} = req.body;
        const userId = req.user.id

        // Validation
        if (!productItemId && !productId) {
          return res.status(400).json({
            error: 'Product item ID is required'
          });
        }

        if (!rating || rating < 0 || rating > 5) {
          return res.status(400).json({
            error: 'Valid rating (0-5) is required'
          });
        }

        if (!title || title.trim() === '') {
          return res.status(400).json({
            error: 'Review title is required'
          });
        }

        if (!comment || comment.trim() === '') {
          return res.status(400).json({
            error: 'Review comment is required'
          });
        }

        let product

        if(productItemId)
          product = await productService.findProductByProductItem(parseInt(productItemId), domainId)
        else
          product = await productService.findProduct(parseInt(productId), domainId)

        // Process uploaded images from memory buffer
        const uploadedImages = req.files && req.files.images ? req.files.images.map(file => ({
          fieldname: file.fieldname,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer, // The actual file data in memory
          encoding: file.encoding
        })) : [];


        let cdnResp = null;
        if (uploadedImages.length > 0) {
          cdnResp = await uploadImagesAilooCDN(uploadedImages, domainId);
        }

        const userDb = await drizzleDb.query.user.findFirst({
          where: (user, {eq}) => eq(user.id, userId),
          with: {
            person: true
          }
        })

        var name = ""
        if (userDb.person)
          name = userDb.person.firstName

        var location = ""
        if (invoiceId) {
          var orderDb = await drizzleDb.query.saleOrder.findFirst({
            where: (saleOrder, {eq}) => eq(saleOrder.invoiceId, parseInt(invoiceId)),
          })


          if (orderDb && orderDb.shippedToId > 0) {
            const addresses = await drizzleDb.select()
                .from(postalAddress)
                .leftJoin(
                    geographicBoundary,
                    eq(postalAddress.comunaId, geographicBoundary.id)
                )
                .where(eq(postalAddress.postalAddressId, orderDb.shippedToId))
                .limit(1)

            if (addresses.length > 0 && addresses[0].geographicboundary) {
              const geo = addresses[0].geographicboundary
              if (geo)
                location = geo.name
            }
          }
        }

        const [result] = await drizzleDb.insert(review).values({
          rating: rating * 2,           // e.g., 5
          title: title,             // e.g., "Excellent Helmet!"
          name: name,           // e.g., "Diego Rosas"
          location: location,           // e.g., "Santiago"
          comments: comment,        // e.g., "Very comfortable at high speeds."
          date: new Date(),              // Current timestamp
          productId: product.id,     // The product being reviewed
          userId: userId,   // Optional: Link to a registered user
          domainId: domainId,                   // Your current domain
          model: cdnResp ? JSON.stringify(
              {
                images: cdnResp.uploads.map(u => {
                  return {id: u.imageId}
                })
              }) : null
        });

        console.log("Review created with ID:", result.insertId);
        const reviewId = result.insertId;


        res.json({
          reviewId: reviewId,
          uploads: cdnResp,
          images: uploadedImages.map(ui => {
            return {
              originalName: ui.originalName,
              size: ui.size,
              encoding: ui.encoding,
              mimetype: ui.mimetype
            };
          }),
        })
      } catch (e) {
        next(e)
      }
    })