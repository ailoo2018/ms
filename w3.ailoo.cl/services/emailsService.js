const {db: drizzleDb} = require("../db/drizzle");
const container = require("../container");
const {getFeaturesDescription} = require("./product-helper");
const parametersClient = require("./parametersClient");
const {OrderItemType} = require("../models/domain");
const path = require("path");
const {promises: fs} = require("fs");
const ProductImageHelper = require("@ailoo/shared-libs/helpers/ProductImageHelper")
const juice = require('juice');
const sgMail = require('@sendgrid/mail');
const {and, eq, sql } = require("drizzle-orm");
const ejs = require('ejs');
const {doHash} = require("../utils/utils");



sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function orderConfirmationHtml(orderId, domainId) {

  const order = await drizzleDb.query.saleOrder.findFirst({
    where: (saleOrder, {eq}) =>
        and(
            eq(saleOrder.id, orderId),
            eq(saleOrder.domainId, domainId),
        ),
    with: {
      paymentMethod: true,
      shipmentMethod: true,
      items: true,
      customer: {
        columns: {
          id: true,
          name: true,
        }
      },
      destinationFacility: {
        columns: {
          id: true,
          name: true,
        }
      },
      shippingAddress: {
        with: {
          comuna: {
            id: true,
            name: true,
          }
        }
        // how can I also get comuna ej: with: comuna
      }
    },
  });
  const domainDb = await drizzleDb.query.domain.findFirst({
    where: (domain, {eq}) => eq(domain.id, domainId),
    with: {
      ownerParty: {
        columns: {
          id: true,
          name: true,
        }
      }
    },
  });

  const pitIds = order.items.filter(it => it.productItemId > 0).map(it2 => it2.productItemId);

  const productsService = container.resolve("productsService")
  const products = await productsService.findProductsByProductItems(pitIds, domainId);
  var imgHelper = new ProductImageHelper();
  for (var item of order.items) {
    if (!(item.productItemId > 0))
      continue;

    item.product = null

    var itemProduct = products.find(p => p.productItems.some(pit => pit.id === item.productItemId));
    if (itemProduct) {
      item.product = itemProduct;
      item.imageURL = imgHelper.getUrl(itemProduct.image, 300, domainId)

      item.productItem = itemProduct.productItems.find(pit => pit.id === item.productItemId)
      item.featureDescription = getFeaturesDescription(item.product, item.productItem);


    }
  }
  const logoParam = await parametersClient.getParameter("DOMAIN", "LOGO", domainId)
  let logo = logoParam ? logoParam.value : {};

  const emailData = {
    order: {
      number: order.id,
      paymentMethod: order.paymentMethod,
      date: order.orderDate,
      receivedBy: {
        name: order.customer ? order.customer.name : "",
      },
      shipmentMethod: order.shipmentMethod,
      items: order.items,
      shippedTo: order.shippingAddress ? {
        name: order.shippingAddress.name,
        rut: order.shippingAddress.rut,
        phone: order.shippingAddress.phone,
        email: order.shippingAddress.email,
        address: order.shippingAddress.address,
        comuna: {
          id: order.shippingAddress.comuna.id,
          name: order.shippingAddress.comuna.name,
          parent: {
            name: "Region Metropolitana"
          }
        }
      } : null,
      destination: {
        name: "Casa",
        phone: "123123",

        postalAddress: {
          address: "",
          comuna: {
            name: "",
          },
          latitude: "",
          longitude: "",
        }
      },

      paymentConfig: {
        bankAccounts: [],
      },
      shippingCost: {
        amount: 1000,
      },
      subtotal: 1000,
      total: 1000,
    },
    OrderItemType: OrderItemType,
    formatOrderDate: function (date) {
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return `${day} ${month}. ${year} ${hours}:${minutes}`;
    },
    formatHelper: {
      toTitleCase: (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
      formatMoney: (amount) => `$${amount.toLocaleString()}`,
      encodeUrl: (str) => encodeURIComponent(str)
    },
    domainHelper: {
      getLogo: () => logo,
      getSiteRoot: () => 'https://www.motomundi.cl'
    },
    domain: {id: 1, name: "MotoMundi", party: {name: "MotoMundi SPA"}},
    isNeto: false,
    tiempoDespacho: '3-5 días hábiles',
    hash: doHash("" + order.id),
    gmapKey: process.env.GOOGLE_MAPS_KEY || '',
    webSite: {
      templateInstance: {
        getConfigValue: key => {
          if(key === "facebook-url"){
            return "https://www.facebook.com/motomundi.la"
          }
          if(key === "instagram-url"){
            return "https://www.instagram.com/motomundi"
          }
          if(key === "youtube-url"){
            return "https://www.youtube.com/motomunditv"
          }
          if(key === "tiktok-url"){
            return "https://www.tiktok.com/motomundicl"
          }
          return "";
        }
      }
    }
  };


  const templatePath = path.join(__dirname, '../templates/confirmation.ejs');
  const template = await fs.readFile(templatePath, 'utf-8');
  const html = ejs.render(template, emailData);
  return { to: order.shippingAddress?.email , html };
}

async function sendOrderConfirmationEmail( orderId, domainId) {

  const { to, html } = await orderConfirmationHtml(orderId, domainId);

  // Inline all CSS styles automatically
  // const inlinedHtml =  juice(html);

  const msg = {
    to: to,
    from: 'ventas@motomundi.cl',
    subject: `Tu pedido ${orderId} en Motomundi ya está en proceso 🏍️`,
    html: html
  };

  return await sgMail.send(msg);


}


module.exports = { sendOrderConfirmationEmail, orderConfirmationHtml }