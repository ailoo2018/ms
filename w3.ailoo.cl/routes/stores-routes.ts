import {db as drizzleDb} from "../db/drizzle.js";
import {and, or, eq, inArray} from "drizzle-orm";
import schema from "../db/schema.js";

// Then use it like this:
import {Router} from "express";

const { facility } = schema;




const router = Router(); // Create a router instead of using 'app'

const calendarBaseUrl = process.env.CALENDAR_URL;


const facilityWeights = new Map<number, number>([
  [5700, 110], // arauco qulicura
  [1, 100], // las condes
  [4228, 95], // argomedo
  [3, 90] // lira
]);

router.get("/:domainId/stores/list", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const facilities = await drizzleDb.query.facility.findMany({
      where: and(
          eq(facility.domainId, domainId),
          or(eq(facility.isAvailableForInternet, 1), eq(facility.id, 5700)),
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
                postalAddress: {
                  with: {
                    comuna: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let filteredFacilities : any = facilities.filter(f1 => {
      return f1.id !== 4597 &&  f1.contacts
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

      f.weight = 0
      if(facilityWeights.has(f.id)){
        f.weight = facilityWeights.get(f.id)
      }

    })

    filteredFacilities = filteredFacilities.filter(f => f.configuration).sort((a, b) => b.weight - a.weight);

    console.log(filteredFacilities);

    res.json({
      facilities: filteredFacilities
    })
  } catch (e) {
    next(e)
  }
})


router.get("/:domainId/stores/:facilityId/calendar", async (req, res, next) => {

  try {
//    const domainId = parseInt(req.params.domainId);
    const facilityId = parseInt(req.params.facilityId);
    const {from, to} = req.query;

    const rs = await fetch(`${calendarBaseUrl}/stores/${facilityId}/schedule?from=${from}&to=${to}`)
    const schedule = await rs.json()
    res.json(schedule)
  }catch (e) {
    next(e)
  }
})

export default router