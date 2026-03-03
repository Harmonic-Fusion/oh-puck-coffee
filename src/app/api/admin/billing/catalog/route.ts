import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { getStripeClient } from "@/lib/billing/stripe";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const stripe = getStripeClient();

  // Fetch products, their features, and prices in parallel
  const [productsRes, featuresRes, pricesRes] = await Promise.all([
    stripe.products.list({ active: true, limit: 100 }),
    stripe.entitlements.features.list({ limit: 100 }),
    stripe.prices.list({ active: true, limit: 100 }),
  ]);

  // For each product, fetch its linked features
  const productFeatures = await Promise.all(
    productsRes.data.map(async (product) => {
      const pf = await stripe.products.listFeatures(product.id, { limit: 100 });
      return { productId: product.id, features: pf.data };
    })
  );

  const featuresByProduct = Object.fromEntries(
    productFeatures.map(({ productId, features }) => [productId, features])
  );

  const products = productsRes.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    active: product.active,
    defaultPrice: product.default_price,
    features: (featuresByProduct[product.id] ?? []).map((pf) => ({
      id: pf.entitlement_feature.id,
      name: pf.entitlement_feature.name,
      lookupKey: pf.entitlement_feature.lookup_key,
      active: pf.entitlement_feature.active,
    })),
    prices: pricesRes.data
      .filter((p) => p.product === product.id)
      .map((p) => ({
        id: p.id,
        unitAmount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
        intervalCount: p.recurring?.interval_count ?? null,
        lookupKey: p.lookup_key,
      })),
  }));

  const features = featuresRes.data.map((f) => ({
    id: f.id,
    name: f.name,
    lookupKey: f.lookup_key,
    active: f.active,
  }));

  return NextResponse.json({ products, features });
}
