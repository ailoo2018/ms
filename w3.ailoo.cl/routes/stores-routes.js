const {app, validateJWT} = require("../server");
const {db: drizzleDb} = require("../db/drizzle");
const {and, eq, asc, inArray} = require("drizzle-orm");
const {facility} = require("../db/schema.ts");

const calendarBaseUrl = process.env.CALENDAR_URL;

app.get("/:domainId/stores/list", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const facilities = await drizzleDb.query.facility.findMany({
      where: and(
          eq(facility.domainId, domainId),
          eq(facility.isAvailableForInternet, 1),
          eq(facility.deleted, 0),
          inArray(facility.type, [0]),
      ),
      // Everything you want to JOIN must go inside 'with'
      with: {
        images: true,
        contacts: {
          with: {
            contactMechanism: {
              with: {
                postalAddress: true
              }
            }
          }
        }
      }
    });

    let filteredFacilities = facilities.filter(f1 => {
      return f1.contacts
          && f1.contacts.length > 0
          && f1.contacts[0].contactMechanism
          && f1.contacts[0].contactMechanism.postalAddress
          && f1.contacts[0].contactMechanism.postalAddress.address
          ;
    });

    filteredFacilities.forEach((f) => {
      if (f.configuration && f.configuration.length > 0)
        f.configuration = JSON.parse(f.configuration);
      f.postalAddress = f.contacts[0].contactMechanism.postalAddress;
      f.contacts = undefined
    })

    filteredFacilities.filter(f => f.configuration)

    res.json({
      facilities: filteredFacilities,
    })
  } catch (e) {
    next(e)
  }
})


app.get("/:domainId/stores/:facilityId/calendar", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId);
    const facilityId = parseInt(req.params.facilityId);
    const {from, to} = req.query;

    const rs = await fetch(`${calendarBaseUrl}/stores/${facilityId}/schedule?from=${from}&to=${to}`)
    const schedule = await rs.json()
    res.json(schedule)
  }catch (e) {
    next(e)
  }
})