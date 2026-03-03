import Stripe from "stripe";
import { config } from "@/shared/config";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    if (!config.stripeApiKey) {
      throw new Error("[billing] STRIPE_API_KEY is not set");
    }
    _stripe = new Stripe(config.stripeApiKey);
  }
  return _stripe;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: returnUrl,
    cancel_url: returnUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

export async function createOrRetrieveCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const stripe = getStripeClient();
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) return customers.data[0].id;
  const customer = await stripe.customers.create({ email, metadata: { userId } });
  return customer.id;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export async function constructWebhookEvent(
  body: string,
  signature: string,
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  if (!config.stripeWebhookSecret) {
    throw new Error("[billing] STRIPE_WEBHOOK_SECRET is not set");
  }
  return stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret);
}
