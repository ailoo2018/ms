import sgMail from "@sendgrid/mail";
import { loadConfig } from "@ailoo/shared-libs/config";

loadConfig()

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


( async() => {
    try{
        const msg = {
            to: String("jcfuentes@ailoo.cl"),
            from: 'ventas@motomundi.cl',
            subject: `Tu pedido 100000 en Motomundi ya está en proceso 🏍️`,
            html: "<h1>Hola</h1>"
        };

        var res =  await sgMail.send(msg);

        console.log(JSON.stringify(res));
    }catch(error){
        console.error("Failed to send email via SendGrid:");

        // 4. Extract detailed SendGrid error messages
        if (error.response && error.response.body) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
        throw error;
    }
})()