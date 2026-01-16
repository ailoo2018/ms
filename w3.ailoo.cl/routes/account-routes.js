const {app, validateJWT} = require("../server");
const {listPartyPostalAddresses} = require("../db/partyDb");
const { db: drizzleDb} = require("../db/drizzle");
const { and, eq } = require("drizzle-orm");

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
  try{
    const userId = req.user.id;

    const result = await drizzleDb.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId),
      // Use 'with' if you need the linked Party (Person) data too
      with: {
        person: true
      }
    });

    res.json(result)
  }catch(err){
    next(err);
  }
})