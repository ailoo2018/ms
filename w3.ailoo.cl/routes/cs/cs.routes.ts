import router from "../events-routes.js";
import {db as drizzleDb} from "../../db/drizzle.js";
import schema, {Party} from "../../db/schema.js";
import {eq} from "drizzle-orm";
import validator from 'validator';
import sgMail from "../../connections/sendmail.js";
import {fileURLToPath} from "url";
import path from "path";
import {promises as fs} from "fs";
import parametersClient from "../../services/parametersClient.js";
import ejs from "ejs";

export interface PriceMatchRequest {
    type: 'notBought' | 'bought';
    product: string;
    brand?: string;
    size: string;
    ourPrice?: number;
    paidPrice?: number; // For 'bought' type
    otherPrice: number;
    link: string;
    storeName: string;
    city: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
    legal: boolean;
    orderNumber?: string;
    purchaseDate?: string;
}

router.post('/:domainId/cs/price-match-guarantee', async (req, res, next) => {
    const data: PriceMatchRequest = req.body;

    // 1. Basic Validation
    if (!data.email || !data.product || !data.legal) {
        return res.status(400).json({ error: 'Missing required fields or legal consent.' });
    }

    // 2. Prepare Email Content
    const isBought = data.type === 'bought';
    const subject = `Solicitud de Igualación de Precio: ${data.product} - ${data.name}`;

    const htmlContent = `
    <h2>Nueva Solicitud de Garantía de Precio Mínimo</h2>
    <p><strong>Tipo:</strong> ${isBought ? 'Ya comprado' : 'Aún no comprado'}</p>
    <hr />
    <h3>Datos del Cliente</h3>
    <ul>
      <li><strong>Nombre:</strong> ${data.name}</li>
      <li><strong>Email:</strong> ${data.email}</li>
      <li><strong>Teléfono:</strong> ${data.phone}</li>
    </ul>
    
    <h3>Datos del Producto</h3>
    <ul>
      <li><strong>Producto:</strong> ${data.product}</li>
      <li><strong>Marca:</strong> ${data.brand || 'N/A'}</li>
      <li><strong>Talla/Color:</strong> ${data.size}</li>
      <li><strong>Precio Motomundi:</strong> ${isBought ? data.paidPrice : data.ourPrice} CLP</li>
      <li><strong>Precio Competencia:</strong> ${data.otherPrice} CLP</li>
    </ul>

    ${isBought ? `
    <h3>Datos de la Compra</h3>
    <ul>
      <li><strong>Nº Pedido:</strong> ${data.orderNumber}</li>
      <li><strong>Fecha:</strong> ${data.purchaseDate}</li>
    </ul>
    ` : ''}

    <h3>Datos de la Competencia</h3>
    <ul>
      <li><strong>Tienda:</strong> ${data.storeName}</li>
      <li><strong>Ciudad:</strong> ${data.city}</li>
      <li><strong>Link:</strong> <a href="${data.link}">${data.link}</a></li>
    </ul>

    <p><strong>Comentarios:</strong> ${data.notes || 'Sin comentarios'}</p>
  `;

    const msg = {
        to: 'jcfuentes@motomundi.cl',
        cc: ['edson@motomundi.net', 'andreas@motomundi.net'],
        from: 'ventas@motomundi.cl', // Must be a verified sender in SendGrid
        subject: subject,
        html: htmlContent,
        replyTo: data.email,
    };

    try {
        await sgMail.send(msg);
        res.status(200).json({ message: 'Solicitud enviada con éxito' });
    } catch (error: any) {
        next(error)
    }
});
export default router;