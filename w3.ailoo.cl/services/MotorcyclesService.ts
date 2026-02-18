import {db as drizzleDb} from "../db/drizzle.js";
import {and, eq, sql} from "drizzle-orm";
import schema from "../db/schema.js";

const {
    user,
    party,
    userConfiguration
} = schema

export class MotorcyclesService {

    private drizzleDb: any

    constructor({drizzleDb}) {
        this.drizzleDb = drizzleDb;

    }

    async deleteUserBike(userId: number, motorcycle: any){
        const userConfigurationDb = await this.drizzleDb.query.userConfiguration.findFirst({
            where: (userConfiguration) => {
                eq(userConfiguration.userId, userId)
            },

        })

        let config = null;
        if(userConfigurationDb){
            config = JSON.parse( userConfigurationDb.configuration )
        }

        if(config.bikes?.length > 0){
            config.bikes = config.bikes.filter(bike => {
                return bike.manufacturer.id !== motorcycle.manufacturer?.id
                    || bike.model.id !== motorcycle.model?.id
                    || bike.year.id !== motorcycle.year?.id
                    ;
            })
        }

        await drizzleDb
            .update(userConfiguration)
            .set({
                configuration: JSON.stringify(config),
            })
            .where(eq(userConfiguration.id, userConfigurationDb.id))

        return userConfigurationDb

    }

    async listUserBikes(userId:number){
        const userConfigurationDb = await this.drizzleDb.query.userConfiguration.findFirst({
            where: (userConfiguration, { eq }) => eq(userConfiguration.userId, userId),

        })

        let config = null;
        if(userConfigurationDb){
            config = JSON.parse( userConfigurationDb.configuration )
        }

        return config?.bikes || [];
    }


    async addUserBike(userId: number, motorcycle: any) {

        const userConfigurationDb = await this.drizzleDb.query.userConfiguration.findFirst({
            where: (userConfiguration) => {
                return eq(userConfiguration.userId, userId)
            },

        })


        let userConfigDb = null
        if (userConfigurationDb) {
            userConfigDb = userConfigurationDb
            let config = JSON.parse(userConfigDb.configuration)
            if( typeof(config) !== "object" ){
                config = {}
            }
            userConfigDb.configuration = config
        } else {

            userConfigDb = {userId: userId, configuration: {bikes: []}}


            const [result] = await drizzleDb.insert(userConfiguration).values({
                userId: userConfigDb.userId,
                configuration: JSON.stringify(userConfigDb.configuration)
            }) as any

            userConfigDb.id = result.insertId
        }

        if (!userConfigDb.configuration.bikes) {
            userConfigDb.configuration.bikes = []
        }

        userConfigDb.configuration.bikes.push({
            manufacturer: { id: motorcycle.bikeManufacturer.id, name: motorcycle.bikeManufacturer.name },
            model: { id: motorcycle.bikeModel.id, name: motorcycle.bikeModel.name },
            year: { id: motorcycle.bikeYear.id, name: motorcycle.bikeYear.name },
        })

        await drizzleDb
            .update(userConfiguration)
            .set({
                configuration: JSON.stringify(userConfigDb.configuration),
            })
            .where(eq(userConfiguration.id, userConfigDb.id))

        return userConfigDb
    }
}