import {pool} from "../connections/mysql.js";
import {drizzle} from "drizzle-orm/mysql2";
import schema from "./schema.js";

// Initialize Drizzle with the schema object
export const db = drizzle(pool, { schema, mode: 'default' });

// Export the db instance
