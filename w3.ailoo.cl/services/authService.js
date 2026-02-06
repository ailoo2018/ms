import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";
import {findCartByWuid, updateCartUserId} from "../el/cart.js";
import schema from "../db/schema.ts";

const {
  user,
  party
} = schema
export const authenticate = async (name, email, wuid, domainId) => {


  let isNewUser = false

  let u = await drizzleDb.query.user.findFirst({
    where: (user) =>
        and(
            eq(user.username, email),
            eq(user.domainId, domainId),
        )

  })

  if (!u) {
    isNewUser = true

    const [result] = await drizzleDb.insert(user).values({
      username: email,
      password: "",
      isGoogleLogin: true,
      domainId: domainId
    })
    u = result
  }

  const [person] =await drizzleDb
      .select()
      .from(party)
      .where(
          and(
              eq(party.type, "PERSON"),
              eq(party.email, email),
              eq(party.domainId, domainId)
          )
      )
      .limit(1);

  let personId = person ? person.id : null;
  if(!person){
    const [result] = await drizzleDb.insert(party).values({
      name: name,
      createDate: new Date(),
      email: email,
      receiveNewsletter: 1,
      domainId: domainId,
    })

    personId = result.insertId
  }else if(name && name.length > 0){
    const [result] = await drizzleDb.update(party).set({
      name: name,
      modifiedDate: new Date(),
    }).where(eq(party.id, personId));
  }

  if(!user.personId)
    drizzleDb
        .update(user)
        .where(eq( user.id, u.id, ))
        .set({ personId: personId })

  // assign user to shopping cart

  const cart = await findCartByWuid(wuid)
  if (cart && !cart.userId || cart.userId === 0) {
    await updateCartUserId(cart.id, u.id)
  }else{

  }


  return { user: u, party: { id: personId, name: name} };
}





