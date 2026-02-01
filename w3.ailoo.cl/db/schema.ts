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
    foreignKey,
    unique,
    bigint,

} = require("drizzle-orm/mysql-core");
const {relations} = require("drizzle-orm");

// Defining the schema namespace
const motomundiSchema = mysqlSchema("motomundi");

const geographicBoundary = motomundiSchema.table("geographicboundary", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", {length: 45}),
    code: varchar("Code", {length: 10}),
    type: varchar("Type", {length: 20}), // e.g., 'COUNTRY', 'REGION', 'COMMUNE'
    geocoding: text("Geocoding"),
    latitude: double("Latitude"),
    longitude: double("Longitude"),
});

const brand = motomundiSchema.table("brand", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", { length: 255 }),
    showInMenu: tinyint("ShowInMenu", { unsigned: true }).notNull().default(0),
    logo: varchar("Logo", { length: 255 }),
    description: text("Description"),
    title: varchar("Title", { length: 255 }),
    linkName: varchar("LinkName", { length: 255 }),
    domainId: int("DomainId"),
    modifiedDate: datetime("ModifiedDate").default("1990-01-01 00:00:00"),
    deleted: smallint("Deleted").default(0),
    showNameInWeb: smallint("ShowNameInWeb"),
    isAvailableForInternet: smallint("IsAvailableForInternet"),
}, (table) => ({
    domainIdx: index("IDX_DOMAIN").on(table.domainId),
    nameDomainIdx: index("IDX_BRAND_NAMEDOMAIN").on(table.name, table.domainId),
}));

const party = motomundiSchema.table("party", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", {length: 255}),
    type: varchar("Type", {length: 20}).notNull(),
    firstName: varchar("FirstName", {length: 45}),
    lastName: varchar("LastName", {length: 45}),
    address: varchar("Address", {length: 255}),
    rut: varchar("Rut", {length: 45}),
    giro: varchar("Giro", {length: 255}),
    phone: varchar("Phone", {length: 45}),
    comuna: varchar("Comuna", {length: 45}),
    email: varchar("Email", {length: 100}),
    ridingStyles: varchar("RidingStyles", {length: 255}),
    receiveNewsletter: smallint("ReceiveNewsletter"),
    comunaId: int("ComunaId"),
    domainId: int("DomainId"),
    tradeName: varchar("TradeName", {length: 255}),
    createDate: datetime("CreateDate"),
    deleted: smallint("Deleted").default(0),
    modifiedDate: datetime("ModifiedDate"),
    noOrderRecovery: smallint("NoOrderRecovery").default(0),
    gender: smallint("Gender"),
    birthDay: datetime("BirthDay"),
    avatar: varchar("Avatar", {length: 45}),
}, (table) => ({
    idxDomain: index("IDX_DOMAIN").on(table.domainId),
    idxPartyEmail: index("IDX_PARTY_EMAIL").on(table.email, table.domainId),
    idxPartyRut: index("IDX_PARTY_RUT").on(table.domainId, table.rut),
}));

const user = motomundiSchema.table("user", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    username: varchar("Username", {length: 255}),
    password: varchar("Password", {length: 255}),
    supplierId: int("SupplierId"),
    personId: int("PersonId"),
    lastLogin: datetime("LastLogin"),
    email: varchar("Email", {length: 100}),
    nickname: varchar("Nickname", {length: 45}),
    isBackEndUser: smallint("IsBackEndUser").notNull().default(0),
    domainId: int("DomainId"),
    hasAccessToB2B: smallint("HasAccessToB2B").default(0),
    deleted: smallint("Deleted").default(0),
    phoneExtension: varchar("PhoneExtension", {length: 5}),
    historyWrongPassword: int("HistoryWrongPassword").default(0),
    isBlocked: smallint("IsBlocked").default(0),
    blockedDate: datetime("BlockedDate"),
    whatsApp: varchar("WhatsApp", {length: 45}),
    avatar: varchar("Avatar", {length: 100}),
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

const model = motomundiSchema.table("model", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", { length: 255 }),
    image: varchar("Image", { length: 45 }),
    domainId: int("DomainId"),
    brandId: int("BrandId"),
    description: text("Description"),
    videos: text("Videos"),
}, (table) => ({
    brandIdx: index("FK_MODEL_BRAND_idx").on(table.brandId),
    brandFk: foreignKey({
        columns: [table.brandId],
        foreignColumns: [brand.id],
        name: "FK_MODEL_BRAND"
    }).onDelete("cascade"),
}));

const product = motomundiSchema.table("product", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    code: varchar("Code", { length: 45 }),
    isHighlighted: tinyint("IsHighlighted", { mode: 'number' }),
    name: varchar("Name", { length: 255 }),
    summary: varchar("Summary", { length: 255 }),
    description: text("Description"),
    createdDate: datetime("CreatedDate"),
    images: text("Images"),
    brandId: int("BrandId"),
    video: text("Video"),
    deleted: tinyint("Deleted").default(0),
    linkName: varchar("LinkName", { length: 255 }),
    domainId: int("DomainId"),
    isAvailableForInternet: smallint("IsAvailableForInternet").default(1),
    requiresLot: smallint("RequiresLot").default(0),
    isTaxExempt: smallint("IsTaxExempt").default(0),
    type: smallint("Type").default(0),
    modifiedDate: datetime("ModifiedDate"),
    createUserId: int("CreateUserId"),
    deleteUserId: int("DeleteUserId"),
    modelId: int("ModelId"),
    isAvailableForMercadoLibre: smallint("IsAvailableForMercadoLibre"),
    config: text("Config"),
    mercadoLibrePublicationType: int("MercadoLibrePublicationType"),
}, (table) => (
    {
    brandIdx: index("BrandId").on(table.brandId),
    domainIdx: index("IDX_DOMAIN").on(table.domainId),
    createdDateIdx: index("PRD_CRTDATE_IDX").on(table.createdDate),
    createUserIdIdx: index("FK_PROD_CRUSER_idx").on(table.createUserId),
    deletedIdx: index("IDX_PROD_DEL").on(table.deleted),
    domainDeletedIdx: index("IDX_PROD_COMP").on(table.domainId, table.deleted),
    codeIdx: index("IDX_PROD_CODE").on(table.code),
    modelIdIdx: index("FK_PROD_MODEL_idx").on(table.modelId),
    nameDomainIdx: index("IDX_PROD_NAME").on(table.name, table.domainId),
    complexSearchIdx: index("IDX_PROD_PRDBRDDEL").on(
        table.name,
        table.brandId,
        table.deleted,
        table.domainId
    ),
    // Foreign Keys
    fkProdBrand: foreignKey({
        columns: [table.brandId],
        foreignColumns: [brand.id],
        name: "FK_PROD_BRAND"
    }),
    fkProdCrUser: foreignKey({
        columns: [table.createUserId],
        foreignColumns: [user.id],
        name: "FK_PROD_CRUSER"
    }).onDelete("set null"),
    fkProdModel: foreignKey({
        columns: [table.modelId],
        foreignColumns: [model.id],
        name: "FK_PROD_MODEL"
    }).onDelete("set null"),
}));

const productItem = motomundiSchema.table("productitem", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    description: varchar("Description", { length: 255 }),
    barCode1: varchar("BarCode1", { length: 100 }),
    barCode2: varchar("BarCode2", { length: 100 }),
    productId: int("ProductId"),
    sku: varchar("SKU", { length: 255 }),
    colorId: int("ColorId"),
    sizeId: int("SizeId"),
    deleted: smallint("Deleted").default(0),
    originId: int("OriginId"),
}, (table) => ({
    productIdIdx: index("FK_PRDITEM_PRD_idx").on(table.productId),
    barcode1Idx: index("IDX_PRDITEM_BARCODE1").on(table.barCode1),
    // Foreign Key Constraint
    fkProdItemProd: foreignKey({
        columns: [table.productId],
        foreignColumns: [product.id],
        name: "FK_PRODITEM_PROD"
    }).onDelete("cascade"),
}));

const facility = motomundiSchema.table("facility", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", {length: 255}),
    code: varchar("Code", {length: 45}),
    type: int("Type"),
    deleted: smallint("Deleted").default(0),
    domainId: int("DomainId"),
    isAvailableForInternet: smallint("IsAvailableForInternet").default(0),
    isHeadquarters: smallint("IsHeadquarters").default(0),
    allowPickup: smallint("AllowPickup").default(0),
    phone: varchar("Phone", {length: 45}),
    configuration: text("Configuration"),
    parentId: int("ParentId"),
    facilityDeliveryTimeId: int("FacilityDeliveryTimeId"),
    linkedFacilityId: int("LinkedFacilityId"),
}, (table) => ({
    domainIdx: index("IDX_DOMAIN").on(table.domainId),
    deliveryTimeIdx: index("FK_FACILITY_DELTIME_idx").on(table.facilityDeliveryTimeId),

    // Foreign Key Constraint
    // Note: Reference 'facilityDeliveryTime' table if you have it mapped
    deliveryTimeFk: foreignKey({
        columns: [table.facilityDeliveryTimeId],
        foreignColumns: [table.id], // Placeholder: Replace with facilityDeliveryTime.id
        name: "FK_FACILITY_DELTIME"
    }).onDelete("set null"),
}));

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
    authCode: varchar("AuthCode", {length: 45}),
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

const saleOrderItem = motomundiSchema.table("saleorderitem", {
    id: int("Id").autoincrement().primaryKey(),
    unitPrice: double("UnitPrice"),
    quantity: decimal("Quantity", {precision: 10, scale: 3}),
    featurePrice: double("FeaturePrice"),
    productId: int("ProductId"),
    orderItemId: int("OrderItemId"),
    featureId: int("FeatureId"),
    orderId: int("OrderId"),
    unitCurrency: varchar("UnitCurrency", {length: 3}).default("CLP"),
    featureCurrency: varchar("FeatureCurrency", {length: 3}).default("CLP"),
    shippingMethodId: int("ShippingMethodId"),
    type: smallint("Type").default(0),
    comment: varchar("Comment", {length: 255}),
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

const postalAddress = motomundiSchema.table("postaladdress", {
    postalAddressId: int("PostalAddressId").primaryKey().notNull(),
    address: varchar("Address", {length: 255}),
    commune: varchar("Commune", {length: 255}),
    region: varchar("Region", {length: 255}),
    city: varchar("City", {length: 255}),
    name: varchar("Name", {length: 255}),
    surname: varchar("Surname", {length: 255}),
    phone: varchar("Phone", {length: 255}),
    email: varchar("Email", {length: 255}),
    receiveInformation: tinyint("ReceiveInformation", {mode: 'number'}),
    comunaId: int("ComunaId"),
    rut: varchar("Rut", {length: 45}),
    comment: text("Comment"),
    countryId: int("CountryId"),
    cityId: int("CityId"),
    postalCode: varchar("PostalCode", {length: 45}),
    latitude: varchar("Latitude", {length: 45}),
    longitude: varchar("Longitude", {length: 45}),
    gmapsUrl: text("GmapsUrl"),
    siiCode: varchar("SiiCode", {length: 20}),
    notifyWhatsApp: smallint("NotifyWhatsApp").notNull().default(0),
    company: varchar("Company", {length: 100}),
    alias: varchar("Alias", {length: 45}),
    createDate: datetime("CreateDate"),
    domainId: int("DomainId"),
    origin: smallint("Origin").default(0),
    address2: varchar("Address2", {length: 255}),
}, (table) => ({
    postalAddressIdx: index("PostalAddressId").on(table.postalAddressId),
}));

const facilityContactMechanism = motomundiSchema.table("facilitycontactmechanism", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    contactMechanismId: int("ContactMechanismId"),
    facilityId: int("FacilityId"),
}, (table) => ({
    // Adding indexes for performance (standard for join tables)
    facilityIdx: index("facility_id_idx").on(table.facilityId),
    contactMechanismIdx: index("contact_mechanism_id_idx").on(table.contactMechanismId),
}));

const contactMechanism = motomundiSchema.table("contactmechanism", {
    id: int("Id").primaryKey().autoincrement().notNull(),
});

const domain = motomundiSchema.table("domain", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", { length: 45 }),
    partyId: int("PartyId"),
    createDate: datetime("CreateDate"),
    ailooPartyId: int("AilooPartyId"),
    status: smallint("Status").default(0),
    deleted: smallint("Deleted").default(0),
    baseUrl: varchar("BaseUrl", { length: 45 }),
    nextBillingDate: datetime("NextBillingDate"),
    plan: varchar("Plan", { length: 45 }),
    paymentPeriod: int("PaymentPeriod"),
    // decimal(11,3) maps to precision: 11, scale: 3
    planPrice: decimal("PlanPrice", { precision: 11, scale: 3 }),
    planCurrency: varchar("PlanCurrency", { length: 3 }),
});

const review = motomundiSchema.table("review", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    rating: int("Rating"),
    title: varchar("Title", {length: 255}),
    name: varchar("Name", {length: 255}),
    location: varchar("Location", {length: 255}),
    sizing: int("Sizing"),
    sizingComment: varchar("SizingComment", {length: 255}),
    pros: varchar("Pros", {length: 255}),
    cons: varchar("Cons", {length: 255}),
    comments: text("Comments"),
    date: datetime("Date"),
    userId: int("UserId"),
    productId: int("ProductId"),
    // State is unsigned in your SQL
    state: int("State", {unsigned: true}).notNull().default(0),
    // tinyint(1) usually maps to boolean mode in Drizzle
    isEvaluation: tinyint("IsEvaluation", {mode: 'number'}).notNull().default(0),
    isDeleted: tinyint("IsDeleted", {mode: 'number'}).notNull().default(0),
    domainId: int("DomainId").default(0),
    likes: smallint("Likes"),
    dislikes: smallint("Dislikes"),
    model: text("Model"),
    videoUrl: varchar("VideoUrl", {length: 200}),
    productItemId: int("ProductItemId"),
}, (table) => ({
    userIdx: index("UserId").on(table.userId),
    productIdx: index("ProductId").on(table.productId),


    fkReviewUser: foreignKey({
        columns: [table.userId],
        foreignColumns: [user.id],
        name: "FK_REVIEW_USER"
    }),
}));

const paymentMethodType = motomundiSchema.table("paymentmethodtype", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", { length: 100 }),
    isAvailableForInternet: smallint("IsAvailableForInternet"),
    domainId: int("DomainId"),
    description: varchar("Description", { length: 255 }),
    deleted: smallint("Deleted").default(0),
});

const shipmentMethodType = motomundiSchema.table("shipmentmethodtype", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    description: varchar("Description", { length: 255 }),
});

const webContentConfiguration = motomundiSchema.table("webcontentconfiguration", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    name: varchar("Name", {length: 255}),
    configuration: text("Configuration"), // SQL says longtext, Drizzle text is sufficient
    domainId: int("DomainId"),
    webContentId: int("WebContentId"),
    isDefault: smallint("IsDefault").notNull().default(0),
    isEnabled: smallint("IsEnabled").default(1),
    content: text("Content"),
    location: varchar("Location", {length: 255}),
    type: smallint("Type").default(0),
    subtype: smallint("Subtype").default(0),
    col: smallint("Col").default(0),
    template: text("Template"),
    title: varchar("Title", {length: 200}),
    orderWeight: smallint("OrderWeight").default(0),
    createDate: datetime("CreateDate"),
    webSiteId: int("WebSiteId"),
    createUserId: int("CreateUserId"),
    modifyUserId: int("ModifyUserId"),
    modifyDate: datetime("ModifyDate"),
    status: smallint("Status"),
    version: smallint("Version"),
    visibility: smallint("Visibility"),
    isFeatured: smallint("IsFeatured"),
    friendlyUrl: varchar("FriendlyUrl", {length: 100}),
    displaySettings: text("DisplaySettings"),
}, (table) => ({
    locationIdx: index("IDX_WCC_LOCATION").on(table.location, table.webSiteId, table.domainId),
    domIdIdx: index("IDX_WCC_DOMID").on(table.domainId),
    websiteIdx: index("IDX_WCC_WEBSITEID").on(table.webSiteId),
}));

const website = motomundiSchema.table("website", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    webServerSiteId: int("WebServerSiteId"),
    name: varchar("Name", {length: 100}),
    templateInstanceId: int("TemplateInstanceId"),
    domainId: varchar("DomainId", {length: 45}),
    categoryId: int("CategoryId").default(0),
    type: smallint("Type"),
    config: text("Config"),
}, (table) => ({
    templateIdx: index("FK_WEBSITE_WCC_idx").on(table.templateInstanceId),
    templateFk: foreignKey({
        columns: [table.templateInstanceId],
        foreignColumns: [webContentConfiguration.id],
        name: "FK_WEBSITE_WCC"
    }),
}));

// --- RELATIONS ---
const reviewRelations = relations(review, ({one}) => ({
    user: one(user, {
        fields: [review.userId],
        references: [user.id],
    }),
}));

const userRelations = relations(user, ({one}) => ({
    person: one(party, {
        fields: [user.personId],
        references: [party.id],
    }),
}));

const saleOrderRelations = relations(saleOrder, ({many, one}) => ({
    items: many(saleOrderItem),
    destinationFacility: one(facility, {
        fields: [saleOrder.destinationFacilityId],
        references: [facility.id],
    }),
    shipmentMethod: one(shipmentMethodType, {
        fields: [saleOrder.shipmentMethodTypeId],
        references: [shipmentMethodType.id],
    }),
    shippingAddress: one(postalAddress, {
        fields: [saleOrder.shippedToId],
        references: [postalAddress.postalAddressId],
    }),
    paymentMethod: one(paymentMethodType, {
        fields: [saleOrder.paymentMethodTypeId],
        references: [paymentMethodType.id],
    }),
    customer: one(party, {
        fields: [saleOrder.orderedBy],
        references: [party.id],
    }),
}));

const saleOrderItemRelations = relations(saleOrderItem, ({one}) => ({
    order: one(saleOrder, {
        fields: [saleOrderItem.orderId],
        references: [saleOrder.id],
    }),
    product: one(product, {
        fields: [saleOrderItem.productId],
        references: [product.id],
    })
}));

const postalAddressRelations = relations(postalAddress, ({one, many}) => ({
    orders: many(saleOrder),
    // Link to the Commune boundary
    comuna: one(geographicBoundary, {
        fields: [postalAddress.comunaId],
        references: [geographicBoundary.id],
    }),
    // Link to the City boundary
    city: one(geographicBoundary, {
        fields: [postalAddress.cityId],
        references: [geographicBoundary.id],
    }),
    // Link to the Country boundary
    country: one(geographicBoundary, {
        fields: [postalAddress.countryId],
        references: [geographicBoundary.id],
    }),
}));

const partyRelations = relations(party, ({many}) => ({
    orders: many(saleOrder),
}));

const orderJournal = motomundiSchema.table("orderjournal", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    description: text("Description"),
    userId: int("UserId"),
    state: int("State"),
    orderId: int("OrderId"),
    creationDate: datetime("CreationDate"),
    imageId: varchar("ImageId", {length: 50}),
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

const facilityImage = motomundiSchema.table("facilityimage", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    image: varchar("Image", {length: 45}),
    url: varchar("Url", {length: 255}),
    facilityId: int("FacilityId"),
});


const websiteRelations = relations(website, ({one, many}) => ({
    // The specific configuration/template that defines this website's layout
    templateInstance: one(webContentConfiguration, {
        fields: [website.templateInstanceId],
        references: [webContentConfiguration.id],
    }),
    // All content configurations associated with this website
//    contents: many(webContentConfiguration),
}));

const geographicBoundaryAssociation = motomundiSchema.table("geographicboundaryassociation", {
    id: int("Id").primaryKey().autoincrement().notNull(),
    belongToId: int("BelongToId"), // The Parent (e.g., Region)
    containsId: int("ContainsId"), // The Child (e.g., Commune)
}, (table) => ({
    // Mirroring the UNIQUE KEY from your SQL
    uniqueAssociation: unique("IDX_GBA_UNIQUE").on(table.containsId, table.belongToId),
}));

const geographicBoundaryRelations = relations(geographicBoundary, ({many}) => ({
    // Boundaries that this one is part of (Parents)
    parentAssociations: many(geographicBoundaryAssociation, {relationName: "child_to_parents"}),
    // Boundaries that are inside this one (Children)
    childAssociations: many(geographicBoundaryAssociation, {relationName: "parent_to_children"}),

}));

const geographicBoundaryAssociationRelations = relations(geographicBoundaryAssociation, ({one}) => ({
    parent: one(geographicBoundary, {
        fields: [geographicBoundaryAssociation.belongToId],
        references: [geographicBoundary.id],
        relationName: "parent_to_children",
    }),
    child: one(geographicBoundary, {
        fields: [geographicBoundaryAssociation.containsId],
        references: [geographicBoundary.id],
        relationName: "child_to_parents",
    }),
}));

const facilityImageRelations = relations(facilityImage, ({one}) => ({
    facility: one(facility, {
        fields: [facilityImage.facilityId],
        references: [facility.id],
    }),
}));

const orderJournalRelations = relations(orderJournal, ({one}) => ({
    order: one(saleOrder, {
        fields: [orderJournal.orderId],
        references: [saleOrder.id],
    }),
    user: one(user, {
        fields: [orderJournal.userId],
        references: [user.id],
    }),
}));

const contactMechanismRelations = relations(contactMechanism, ({one}) => ({
    postalAddress: one(postalAddress, {
        fields: [contactMechanism.id],
        references: [postalAddress.postalAddressId],
    }),
}));

const facilityContactMechanismRelations = relations(facilityContactMechanism, ({one}) => ({
    facility: one(facility, {
        fields: [facilityContactMechanism.facilityId],
        references: [facility.id],
    }),
    contactMechanism: one(contactMechanism, {
        fields: [facilityContactMechanism.contactMechanismId],
        references: [contactMechanism.id],
    }),
}));

const facilityRelations = relations(facility, ({one, many}) => ({
    // Images
    images: many(facilityImage),
    contacts: many(facilityContactMechanism),
    // Linked Facility relation
/*
    linkedFacility: one(facility, {
        fields: [facility.linkedFacilityId],
        references: [facility.id],
    }),
*/
}));

const domainRelations = relations(domain, ({ one }) => ({
    ownerParty: one(party, {
        fields: [domain.partyId],
        references: [party.id],
    }),
}));

const brandRelations = relations(brand, ({ many }) => ({
    models: many(model),
    products: many(product),
}));

const modelRelations = relations(model, ({ one, many }) => ({
    brand: one(brand, {
        fields: [model.brandId],
        references: [brand.id],
    }),
    products: many(product),
}));

const productRelations = relations(product, ({ one, many }) => ({
    // The manufacturer/brand of the product
    brand: one(brand, {
        fields: [product.brandId],
        references: [brand.id],
    }),

    // The specific model line this product belongs to
    model: one(model, {
        fields: [product.modelId],
        references: [model.id],
    }),

    // The back-office user who created this product entry
    creator: one(user, {
        fields: [product.createUserId],
        references: [user.id],
    }),


}));

const productItemRelations = relations(productItem, ({ one }) => ({
    product: one(product, {
        fields: [productItem.productId],
        references: [product.id],
    }),
}));


module.exports = {
    brand,
    model,
    product,
    productRelations,
    brandRelations,
    modelRelations,
    motomundiSchema,
    productItem,
    productItemRelations,
    domain,
    domainRelations,
    saleOrder,
    saleOrderItem,
    postalAddress,
    facility,
    facilityImage,
    facilityImageRelations,
    facilityContactMechanism,
    facilityContactMechanismRelations,
    facilityRelations,
    user,
    party,
    contactMechanism,
    userRelations,
    saleOrderRelations,
    saleOrderItemRelations,
    shipmentMethodType,
    postalAddressRelations,
    partyRelations,
    orderJournal,
    orderJournalRelations,
    contactMechanismRelations,
    review,
    reviewRelations,
    geographicBoundary,
    geographicBoundaryAssociation,
    geographicBoundaryAssociationRelations,
    geographicBoundaryRelations,
    website,
    webContentConfiguration,
    websiteRelations,

    paymentMethodType,
};