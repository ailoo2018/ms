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
    id?: number,
    name: string;
    price?: number;
    pipeline_id?: number;
    status_id?: number;
    created_by?: number;
    created_at?: number;
    // This is where you map form data to custom fields in Kommo
    custom_fields_values?: {
        field_id: number;
        values: { value: string | number }[];
    }[];
    responsible_user_id: number;
    _embedded?: {
        contacts?: Array<{ id: number; is_main: boolean }>;
    };
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

interface KommoNote {
    entity_id: number;
    note_type: 'common'; // 'common' is the standard text note
    params: {
        text: string;
    };
}

const subdomain = process.env.KOMMO_SUBDOMAIN || 'motomundi';
const accessToken = process.env.KOMMO_ACCESS_TOKEN;

export async function createKommoLead(customerEmail: string, subject: string, pipelineId: number): Promise<any> {

    const endpoint = `https://${subdomain}.kommo.com/api/v4/leads/complex`;

    // 3. Construct the payload (MUST be an array, even for one lead)
    const newLeads: KommoComplexLead[] = [
        {
            name: subject,
            price: 0, // Optional: useful if the query is about a specific product value
            pipeline_id: pipelineId,

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


export async function createKommoNote(leadId: number, message: string): Promise<any> {


    // Endpoint for adding notes to a specific lead
    const endpoint = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}/notes`;

    const notePayload: KommoNote[] = [
        {
            entity_id: leadId,
            note_type: 'common',
            params: {
                text: `Consulta del cliente:\n${message}`
            }
        }
    ];

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notePayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create note: ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error adding note to lead ${leadId}:`, error);
    }
}
// Execute the function


import axios from 'axios';


interface KommoSearchResponse {
    _embedded?: {
        leads: KommoLead[];
    };
}

export async function findLeadByPhone(phoneNumber: string): Promise<KommoLead[] | null> {
    const baseUrl = `https://${subdomain}.kommo.com/api/v4`;
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // Step 1: Find contacts matching the phone number
        const contactsResponse = await axios.get(`${baseUrl}/contacts`, {
            headers,
            params: {
                query: phoneNumber,
                with: 'leads' // Ask Kommo to embed associated leads in the response
            }
        });

        if (contactsResponse.status === 204 || !contactsResponse.data._embedded?.contacts) {
            console.log('No contacts found matching that phone number.');
            return null;
        }

        const contacts = contactsResponse.data._embedded.contacts;

        // Step 2: Collect all lead IDs from matched contacts
        const leadIds: number[] = contacts.flatMap((contact: any) =>
            contact._embedded?.leads?.map((l: any) => l.id) ?? []
        );

        if (leadIds.length === 0) {
            console.log('Contacts found but no associated leads.');
            return null;
        }

        // Step 3: Fetch full lead details by IDs
        const leadsResponse = await axios.get(`${baseUrl}/leads`, {
            headers,
            params: {
                'filter[id]': leadIds.join(','),
                'order[created_at]': 'desc'
            }
        });

        if (!leadsResponse.data._embedded?.leads) return null;

        return leadsResponse.data._embedded.leads.map((lead: any) => ({
            ...lead,
            createDate: new Date(lead.created_at * 1000)
        }));

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error:', error.response?.data || error.message);
        }
        throw error;
    }
}

export async function findLeadByPhone_bak(phoneNumber: string): Promise<KommoLead[] | null > {

    const url = `https://${subdomain}.kommo.com/api/v4/leads`;

    try {
        const response = await axios.get<KommoSearchResponse>(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            params: {
                // The 'query' parameter searches across phone, email, and name
                query: phoneNumber,
                'order[created_at]': 'desc'
            }
        });

        if (response.status === 204 || !response.data._embedded) {
            console.log('No leads found matching that phone number.');
            return null;
        }

        var leads =  response.data._embedded.leads;

        const mappedLeads = leads.map( lead => {
            return {createDate: new Date(lead.created_at * 1000), ...lead}
        })

        return mappedLeads;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error:', error.response?.data || error.message);
        }
        throw error;
    }
}

export async function getUserDetails(userId: number): Promise<any> {

    const url = `https://${subdomain}.kommo.com/api/v4/users/${userId}`;

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${accessToken}`, }
        });

        return response.data; // Contains name, email, role, etc.
    } catch (error) {
        console.error('User not found or API error');
        return null;
    }
}

// Example Usage:
// findLeadByPhone('+1234567890').then(leads => console.log(leads));