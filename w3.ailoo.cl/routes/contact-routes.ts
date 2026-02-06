import sgMail from "@sendgrid/mail";
import {errors} from "@elastic/elasticsearch";
import paramClient from "../services/parametersClient.js";

import {Router} from "express";
const router = Router(); // Create a router instead of using 'app'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

router.post("/:domainId/contact", async (req, res, next) => {

  try {

    const body = req.body
    const param = await paramClient.getParameter("DOMAIN", "LOGO", 1)

    const now = new Date()
    const fecha = now.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const hora = now.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    })

    const msg = {
      to: "ventas@motomundi.cl",
      bcc: "jcfuentes@motomundi.net",
      from: 'motohub@motohub.cl', // Change to your verified sender
      subject: `MOTOMUNDI - CONSULTA CLIENTE`,
      html: `

        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #d6001c 0%, #a00015 100%);
              color: #ffffff;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .header p {
              margin: 10px 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .info-section {
              background: #f8f9fa;
              border-left: 4px solid #d6001c;
              padding: 20px;
              margin-bottom: 25px;
              border-radius: 4px;
            }
            .info-row {
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 1px solid #e0e0e0;
            }
            .info-row:last-child {
              margin-bottom: 0;
              padding-bottom: 0;
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #d6001c;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 1px;
              margin-bottom: 5px;
              display: block;
            }
            .value {
              color: #333;
              font-size: 15px;
            }
            .message-section {
              background: #ffffff;
              border: 2px solid #e0e0e0;
              padding: 20px;
              margin-top: 20px;
              border-radius: 4px;
            }
            .message-section .label {
              margin-bottom: 10px;
            }
            .message-text {
              color: #333;
              font-size: 15px;
              line-height: 1.8;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              background: #1a1a1a;
              color: #ffffff;
              padding: 20px 30px;
              text-align: center;
              font-size: 12px;
            }
            .footer p {
              margin: 5px 0;
              opacity: 0.8;
            }
            .timestamp {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 4px;
              font-size: 13px;
              color: #856404;
            }
            .cta-button {
              display: inline-block;
              background: #d6001c;
              color: #ffffff;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-size: 14px;
              margin-top: 20px;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 0;
                border-radius: 0;
              }
              .content {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>Nueva Consulta</h1>
              <p>Formulario de Contacto - Sitio Web</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Timestamp -->
              <div class="timestamp">
                <strong>📅 Recibido:</strong> ${fecha} a las ${hora}
              </div>

              <!-- Cliente Information -->
              <div class="info-section">
                <h2 style="margin-top: 0; margin-bottom: 20px; color: #d6001c; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
                  Información del Cliente
                </h2>
                
                <div class="info-row">
                  <span class="label">Nombre</span>
                  <span class="value">${body.nombre}</span>
                </div>

                <div class="info-row">
                  <span class="label">Email</span>
                  <span class="value">
                    <a href="mailto:${body.email}" style="color: #d6001c; text-decoration: none;">
                      ${body.email}
                    </a>
                  </span>
                </div>

                <div class="info-row">
                  <span class="label">Teléfono</span>
                  <span class="value">
                    <a href="tel:${body.telefono}" style="color: #d6001c; text-decoration: none;">
                      ${body.telefono}
                    </a>
                  </span>
                </div>
              </div>

              <!-- Mensaje -->
              <div class="message-section">
                <span class="label">Consulta / Mensaje</span>
                <div class="message-text">${body.consulta}</div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="mailto:${body.email}" class="cta-button">
                  Responder al Cliente
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>MOTOMUNDI</strong></p>
              <p>Este email fue generado automáticamente desde el formulario de contacto del sitio web.</p>
              <p>© ${new Date().getFullYear()} MOTOMUNDI - Todos los derechos reservados</p>
            </div>
          </div>
        </body>
        </html>
        `,

    }

    const sgRs = await sgMail.send(msg)

    res.json(sgRs)
  } catch (error) {
    next(error)
  }
})

export default router