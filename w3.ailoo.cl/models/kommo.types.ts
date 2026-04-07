// 1. Define the interface for the Kommo Lead payload
interface KommoContact {
    name: string;
    custom_fields_values: {
        field_code: string;
        values: {
            value: string;
            enum_code?: string;
        }[];
    }[];
}

interface KommoLead {
    name: string;
    price?: number;
    pipeline_id?: number;
    status_id?: number;
    created_by?: number;
    // This is where you map form data to custom fields in Kommo
    custom_fields_values?: {
        field_id: number;
        values: { value: string | number }[];
    }[];
}

interface KommoComplexLead {
    name: string;
    price?: number;
    pipeline_id?: number;
    status_id?: number;
    _embedded: {
        contacts: KommoContact[];
    };
    custom_fields_values?: {
        field_id?: number;
        field_code?: string;
        values: {
            value: string | number,

            enum_code?: string
        }[];
    }[];
}


export async function createKommoLead(customerEmail: string, subject: string): Promise<any> {
    // 2. Set up your authentication and endpoint
    // You can find your subdomain in your Kommo URL (e.g., https://yourbrand.kommo.com)
    const subdomain = process.env.KOMMO_SUBDOMAIN || 'motomundi';

    // Kommo supports long-lived tokens for private integrations, which are much easier
    // to manage than OAuth if this is just an internal script!
    const accessToken = process.env.KOMMO_ACCESS_TOKEN

    const endpoint = `https://${subdomain}.kommo.com/api/v4/leads/complex`;

    // 3. Construct the payload (MUST be an array, even for one lead)
    const newLeads: KommoComplexLead[] = [
        {
            name: subject,
            price: 0, // Optional: useful if the query is about a specific product value
            pipeline_id: 13485780,

            _embedded: {
                contacts: [
                    {
                        "name": customerEmail.split('@')[0],
                        "custom_fields_values": [
                            {
                                "field_code": "EMAIL",
                                "values": [
                                    {
                                        "value": customerEmail,
                                        "enum_code": "WORK"
                                    }
                                ]
                            }
                        ]

                    }]
            },
        }
    ];

    try {
        // 4. Make the POST request to Kommo
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newLeads)
        });

        const data = await response.json();

        // Catch API-specific errors (Kommo returns 400 for bad data, 401 for bad tokens)
        if (!response.ok) {
            throw new Error(`Kommo API Error (${response.status}): ${JSON.stringify(data)}`);
        }

        console.log('Lead successfully created in Kommo!');

        // 5. Kommo returns the newly created entities inside an '_embedded' object
        const createdLeads = data._embedded?.leads || [];
        createdLeads.forEach((lead: any) => {
            console.log(`New Lead GID: ${lead.id}`);
        });

        return data;
    } catch (error) {
        console.error('Failed to create Kommo lead:', error);
    }
}

// Execute the function
