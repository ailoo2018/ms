const {
    mysqlTable,
    mysqlSchema,
    int,
    datetime,
    varchar,
    text,
    smallint,
    tinyint,
    double,
    decimal,
    index,
    foreignKey
} = require("drizzle-orm/mysql-core");
const { relations } = require("drizzle-orm");

// Defining the schema namespace
const motomundiSchema = mysqlSchema("motomundi");

// --- SaleOrder Table ---
const saleOrder = motomundiSchema.table("saleorder", {
    id: int("Id").autoincrement().primaryKey(),
    orderDate: datetime("OrderDate"),
    shippedToId: int("ShippedToId"),
    state: int("State").notNull().default(0),
    paymentMethodTypeId: int("PaymentMethodTypeId"),
    orderedBy: int("OrderedBy"),
    domainId: int("DomainId"),
    type: smallint("Type").default(0),
    comment: text("Comment"),
    deleted: smallint("Deleted").default(0),
    shipmentMethodTypeId: int("ShipmentMethodTypeId"),
    authCode: varchar("AuthCode", { length: 45 }),
    invoiceId: int("InvoiceId"),
    createUserId: int("CreateUserId"),
    destinationFacilityId: int("DestinationFacilityId"),
    saleTypeId: int("SaleTypeId"),
    invoicedTo: int("InvoicedTo"),
    expectedDeliveryDate: datetime("ExpectedDeliveryDate"),
    paymentData: text("PaymentData"),
}, (table) => ({
    idxDomain: index("IDX_DOMAIN").on(table.domainId),
    shippedToIdx: index("ShippedToId").on(table.shippedToId),
}));

// --- SaleOrderItem Table ---
const saleOrderItem = motomundiSchema.table("saleorderitem", {
    id: int("Id").autoincrement().primaryKey(),
    unitPrice: double("UnitPrice"),
    quantity: decimal("Quantity", { precision: 10, scale: 3 }),
    featurePrice: double("FeaturePrice"),
    productId: int("ProductId"),
    orderItemId: int("OrderItemId"),
    featureId: int("FeatureId"),
    orderId: int("OrderId"),
    unitCurrency: varchar("UnitCurrency", { length: 3 }).default("CLP"),
    featureCurrency: varchar("FeatureCurrency", { length: 3 }).default("CLP"),
    shippingMethodId: int("ShippingMethodId"),
    type: smallint("Type").default(0),
    comment: varchar("Comment", { length: 255 }),
    productItemId: int("ProductItemId"),
    couponId: int("CouponId"),
}, (table) => ({
    featureIdx: index("FeatureId").on(table.featureId),
    orderIdx: index("OrderId").on(table.orderId),
    orderItemIdx: index("OrderItemId").on(table.orderItemId),
    productIdx: index("ProductId").on(table.productId),
    saleOrderFk: foreignKey({
        columns: [table.orderId],
        foreignColumns: [saleOrder.id],
        name: "fk_saleorderitem_saleorder"
    }).onDelete("cascade"),
}));

// --- PostalAddress Table ---
const postalAddress = motomundiSchema.table("postaladdress", {
    postalAddressId: int("PostalAddressId").primaryKey().notNull(),
    address: varchar("Address", { length: 255 }),
    commune: varchar("Commune", { length: 255 }),
    region: varchar("Region", { length: 255 }),
    city: varchar("City", { length: 255 }),
    name: varchar("Name", { length: 255 }),
    surname: varchar("Surname", { length: 255 }),
    phone: varchar("Phone", { length: 255 }),
    email: varchar("Email", { length: 255 }),
    receiveInformation: tinyint("ReceiveInformation", { mode: 'number' }),
    comunaId: int("ComunaId"),
    rut: varchar("Rut", { length: 45 }),
    comment: text("Comment"),
    countryId: int("CountryId"),
    cityId: int("CityId"),
    postalCode: varchar("PostalCode", { length: 45 }),
    latitude: varchar("Latitude", { length: 45 }),
    longitude: varchar("Longitude", { length: 45 }),
    gmapsUrl: text("GmapsUrl"),
    siiCode: varchar("SiiCode", { length: 20 }),
    notifyWhatsApp: smallint("NotifyWhatsApp").notNull().default(0),
    company: varchar("Company", { length: 100 }),
    alias: varchar("Alias", { length: 45 }),
    createDate: datetime("CreateDate"),
    domainId: int("DomainId"),
    origin: smallint("Origin").default(0),
    address2: varchar("Address2", { length: 255 }),
}, (table) => ({
    postalAddressIdx: index("PostalAddressId").on(table.postalAddressId),
}));

// --- Party Table ---
const party = motomundiSchema.table("party", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", { length: 255 }),
    type: varchar("Type", { length: 20 }).notNull(),
    firstName: varchar("FirstName", { length: 45 }),
    lastName: varchar("LastName", { length: 45 }),
    address: varchar("Address", { length: 255 }),
    rut: varchar("Rut", { length: 45 }),
    giro: varchar("Giro", { length: 255 }),
    phone: varchar("Phone", { length: 45 }),
    comuna: varchar("Comuna", { length: 45 }),
    email: varchar("Email", { length: 100 }),
    ridingStyles: varchar("RidingStyles", { length: 255 }),
    receiveNewsletter: smallint("ReceiveNewsletter"),
    comunaId: int("ComunaId"),
    domainId: int("DomainId"),
    tradeName: varchar("TradeName", { length: 255 }),
    createDate: datetime("CreateDate"),
    deleted: smallint("Deleted").default(0),
    modifiedDate: datetime("ModifiedDate"),
    noOrderRecovery: smallint("NoOrderRecovery").default(0),
    gender: smallint("Gender"),
    birthDay: datetime("BirthDay"),
    avatar: varchar("Avatar", { length: 45 }),
}, (table) => ({
    idxDomain: index("IDX_DOMAIN").on(table.domainId),
    idxPartyEmail: index("IDX_PARTY_EMAIL").on(table.email, table.domainId),
    idxPartyRut: index("IDX_PARTY_RUT").on(table.domainId, table.rut),
}));

// --- User Table ---
const user = motomundiSchema.table("user", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    username: varchar("Username", { length: 255 }),
    password: varchar("Password", { length: 255 }),
    supplierId: int("SupplierId"),
    personId: int("PersonId"),
    lastLogin: datetime("LastLogin"),
    email: varchar("Email", { length: 100 }),
    nickname: varchar("Nickname", { length: 45 }),
    isBackEndUser: smallint("IsBackEndUser").notNull().default(0),
    domainId: int("DomainId"),
    hasAccessToB2B: smallint("HasAccessToB2B").default(0),
    deleted: smallint("Deleted").default(0),
    phoneExtension: varchar("PhoneExtension", { length: 5 }),
    historyWrongPassword: int("HistoryWrongPassword").default(0),
    isBlocked: smallint("IsBlocked").default(0),
    blockedDate: datetime("BlockedDate"),
    whatsApp: varchar("WhatsApp", { length: 45 }),
    avatar: varchar("Avatar", { length: 100 }),
}, (table) => ({
    supplierIdx: index("SupplierId").on(table.supplierId),
    domainIdx: index("IDX_DOMAIN").on(table.domainId),
    personIdx: index("FK_USER_PARTY_idx").on(table.personId),
    fkUserParty: foreignKey({
        columns: [table.personId],
        foreignColumns: [party.id],
        name: "FK_USER_PARTY"
    }).onDelete("cascade"),
}));

const contactMechanism = motomundiSchema.table("contactmechanism", {
    id: int("Id").primaryKey().autoincrement().notNull(),
});

// --- RELATIONS ---

const userRelations = relations(user, ({ one }) => ({
    person: one(party, {
        fields: [user.personId],
        references: [party.id],
    }),
}));

const saleOrderRelations = relations(saleOrder, ({ many, one }) => ({
    items: many(saleOrderItem),
    shippingAddress: one(postalAddress, {
        fields: [saleOrder.shippedToId],
        references: [postalAddress.postalAddressId],
    }),
    customer: one(party, {
        fields: [saleOrder.orderedBy],
        references: [party.id],
    }),
}));

const saleOrderItemRelations = relations(saleOrderItem, ({ one }) => ({
    order: one(saleOrder, {
        fields: [saleOrderItem.orderId],
        references: [saleOrder.id],
    }),
}));

const postalAddressRelations = relations(postalAddress, ({ many }) => ({
    orders: many(saleOrder),
}));

const partyRelations = relations(party, ({ many }) => ({
    orders: many(saleOrder),
}));


const orderJournal = motomundiSchema.table("orderjournal", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    description: text("Description"),
    userId: int("UserId"),
    state: int("State"),
    orderId: int("OrderId"),
    creationDate: datetime("CreationDate"),
    imageId: varchar("ImageId", { length: 50 }),
}, (table) => ({
    userIdx: index("FK_ORDJRN_USER_idx").on(table.userId),
    orderIdx: index("FK_ORDJRN_ORDER_idx").on(table.orderId),

    // Foreign Key Constraints
    fkOrder: foreignKey({
        columns: [table.orderId],
        foreignColumns: [saleOrder.id],
        name: "FK_ORDJRN_ORDER"
    }).onDelete("cascade"),

    fkUser: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "FK_ORDJRN_USER"
    }),
}));

// --- RELATIONS ---
const orderJournalRelations = relations(orderJournal, ({ one }) => ({
    order: one(saleOrder, {
        fields: [orderJournal.orderId],
        references: [saleOrder.id],
    }),
    user: one(user, {
        fields: [orderJournal.userId],
        references: [user.id],
    }),
}));

// --- EXPORTS ---

module.exports = {
    motomundiSchema,
    saleOrder,
    saleOrderItem,
    postalAddress,
    user,
    party,
    contactMechanism,
    userRelations,
    saleOrderRelations,
    saleOrderItemRelations,
    postalAddressRelations,
    partyRelations,
    orderJournal,
    orderJournalRelations
};