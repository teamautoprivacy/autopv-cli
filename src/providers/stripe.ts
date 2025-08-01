import Stripe from 'stripe';

export interface StripeExportResult {
    customers: Stripe.Customer[];
    charges: Stripe.Charge[];
    methods: Stripe.PaymentMethod[];
}

export class StripeProvider {
    private stripe: Stripe;

    constructor(secretKey: string) {
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2023-10-16',
        });
    }

    async exportCustomerData(email: string): Promise<StripeExportResult> {
        const result: StripeExportResult = {
            customers: [],
            charges: [],
            methods: []
        };

        try {
            // Search for customers by email
            const customerSearch = await this.stripe.customers.search({
                query: `email:'${email}'`,
                limit: 100
            });

            result.customers = customerSearch.data;

            if (result.customers.length === 0) {
                console.warn(`No Stripe customers found with email: ${email}`);
                return result;
            }

            // For each customer, get their charges and payment methods
            for (const customer of result.customers) {
                try {
                    // Get charges for this customer
                    const charges = await this.stripe.charges.list({
                        customer: customer.id,
                        limit: 100
                    });
                    result.charges.push(...charges.data);

                    // Get payment methods for this customer
                    const paymentMethods = await this.stripe.paymentMethods.list({
                        customer: customer.id,
                        limit: 100
                    });
                    result.methods.push(...paymentMethods.data);

                } catch (customerError: any) {
                    console.warn(`Error fetching data for customer ${customer.id}:`, customerError.message);
                }
            }

        } catch (error: any) {
            throw new Error(`Stripe API error: ${error.message}`);
        }

        return result;
    }

    calculateTotalCharges(charges: Stripe.Charge[]): number {
        return charges.reduce((total, charge) => {
            // Only count successful charges
            if (charge.status === 'succeeded') {
                return total + charge.amount;
            }
            return total;
        }, 0);
    }

    formatAmount(amountInCents: number, currency: string = 'usd'): string {
        const amount = amountInCents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount);
    }
}
