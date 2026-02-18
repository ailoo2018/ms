import {Router} from "express";
import { authenticate} from "../services/authService.js";
import jwt from "jsonwebtoken";
import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq} from "drizzle-orm";
import crypto from "crypto";
import {doHash} from "../utils/utils.js";

import schema from "../db/schema.js"


const router = Router();
const { user, party}  = schema

router.get("/:domainId/auth/test", async (req, res, next) => {
  try {
    const ret = await authenticate("Juan", "jcfuentes@lava.cl", "071882aa-5d83-4b54-b26c-0d9651c0e959", 1);
    res.json(ret);
  } catch (error) {
    next(error)
  }
})

router.post("/:domainId/auth/login", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);

    // 1. Use req.body instead of req.query for sensitive data
    const {username, password} = req.body;

    // 2. Query the user
    const dbUser = await drizzleDb.query.user.findFirst({
      where: (user) => and(
          eq(user.username, username),      // Use eq() for exact match on email/username
          eq(user.domainId, domainId)
      ),
      with: {
        person: true
      }

    });

    if (!dbUser) {
      return res.status(401).json({
        code: 'USER_NOT_FOUND',
        error: "Invalid credentials"
      });
    }

    // 3. Password Verification (MD5 Logic)
    // Note: In production, use bcrypt.compare() instead
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

    if (hashedPassword !== dbUser.password) {
      return res.status(401).json({
        code: 'WRONG_PASSWORD',
        error: "Invalid credentials"
      });
    }

    const party = dbUser.person
    // 4. Return user (excluding the password field)
    const {password: _, ...userWithoutPassword} = dbUser;

    res.json({
      userId: dbUser.id,
      username: dbUser.username,
      partyId: party.id,
      partyName: party.name,
      accessToken: createToken({
        id: dbUser.id,
        username: dbUser.username,
        partyId: party.id,

      })
    });

  } catch (error) {
    next(error);
  }
});

router.post("/:domainId/auth/hash-login", async (req, res, next) => {
  try {
    const domainId = parseInt(req.params.domainId);
    const {hash, pid, wuid} = req.body;

    if (hash !== doHash(pid)) {
      return res.status(401).json({error: "Invalid credentials", message: "Invalid credentials"});
    }

    const partyDb = await drizzleDb.query.party.findFirst({
      where: (party, {eq}) => eq(party.id, pid)
    })

    // 2. Query the user
    let dbUser = await drizzleDb.query.user.findFirst({
      where: (user) => and(
          eq(user.personId, pid),      // Use eq() for exact match on email/username
      ),
    });

    if (!dbUser) {
      const [result] = await drizzleDb.insert(user).values({
        username: "" + party.email,
        password: "mx000006",
        domainId: domainId,
      })


      dbUser = await drizzleDb.query.user.findFirst({
        where: (user) => and(
            eq(user.id, result.insertId),      // Use eq() for exact match on email/username
        ),
      });
    }

    if(dbUser.username && dbUser.username === "[object Object]"){
      dbUser.username = ""
    }

    res.json({
      userId: dbUser.id,
      username: dbUser.username,
      partyId: partyDb.id,
      partyName: partyDb.name,
      accessToken: createToken({
        id: dbUser.id,
        username: dbUser.username,
        partyId: partyDb.id,

      })
    });

  } catch (error) {
    next(error);
  }
});


router.get("/:domainId/auth/google", async (req, res, next) => {

  try {
    const domainId = parseInt(req.params.domainId)
    const {authCode, wuid} = req.query

    var googleplus_client_id = "573119085091-10gjskn72s3dsfmncmmhppe6p8o3u1qj.apps.googleusercontent.com"
    var googleplus_client_secret = "ihdCgOisRfjZa07cdSlen6Eb"

    // 1. Create the data object
    const params = new URLSearchParams({
      code: authCode,
      client_id: googleplus_client_id,
      client_secret: googleplus_client_secret,
      redirect_uri: "https://www.motomundi.cl",
      grant_type: 'authorization_code',
    })

    const bodyString = params.toString();

    const buffer = Buffer.from(bodyString, 'utf-8');

    const tokenRs = await fetch("https://accounts.google.com/o/oauth2/token", {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: bodyString,
    })

    const token = await tokenRs.json()


    if (token.error) {
      throw new Error(token.error)
    }

    const userInfoRs = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?access_token=" + token.access_token)
    const userInfo = await userInfoRs.json()

    console.log('Google Response:', userInfo)

    const {user, party} = await authenticate(userInfo.name, userInfo.email, wuid, domainId)


    res.json({
      userId: user.id,
      username: user.username,
      partyId: party.id,
      partyName: party.name,
      accessToken: createToken({
        id: user.id,
        username: user.username,
        partyId: party.id,

      })

    })
  } catch (e) {
    next(e)
  }

})

function createToken(pl) {
  const secretKey = process.env.JWT_SECRET;
  const iat = Math.floor(Date.now() / 1000)
  const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30)
  // Create the token
  const token = jwt.sign({...pl, iat, exp}, secretKey);

  return token;
}

export default router