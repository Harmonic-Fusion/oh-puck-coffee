import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/billing/stripe";

export async function GET() {
  const stripe = getStripeClient();

  const [productsRes, pricesRes, featuresRes] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.prices.list({ active: true, limit: 100 }),
    stripe.entitlements.features.list({ limit: 100 }),
  ]);

  // Fetch linked features for each product
  const productFeatures = await Promise.all(
    productsRes.data.map(async (product) => {
      const pf = await stripe.products.listFeatures(product.id, {
        limit: 100,
      });
      return {
        productId: product.id,
        featureKeys: pf.data.map(
          (f) => f.entitlement_feature.lookup_key,
        ),
      };
    }),
  );

  const featuresByProduct = Object.fromEntries(
    productFeatures.map(({ productId, featureKeys }) => [
      productId,
      featureKeys,
    ]),
  );

  const plans = productsRes.data.map((product) => {
    const prices = pricesRes.data
      .filter((p) => p.product === product.id)
      .map((p) => ({
        id: p.id,
        unitAmount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
      }));

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      prices,
      entitlements: featuresByProduct[product.id] ?? [],
    };
  });

  // All known Stripe entitlement features
  const features = featuresRes.data.map((f) => ({
    id: f.id,
    name: f.name,
    lookupKey: f.lookup_key,
    active: f.active,
  }));

  return NextResponse.json({ plans, features });
}
