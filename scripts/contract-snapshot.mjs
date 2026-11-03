/**
 * Extracts a compact contract snapshot from the backend OpenAPI document.
 *
 * Usage:
 *   node scripts/contract-snapshot.mjs                    # fetch localhost:8080
 *   node scripts/contract-snapshot.mjs --url http://host/v3/api-docs
 *   node scripts/contract-snapshot.mjs --in /tmp/openapi.json
 *
 * Writes contract/contract.snapshot.json. Re-run after any backend DTO change
 * and commit the diff — `test/contract-drift.test.mjs` fails when the SDK and
 * the snapshot disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = path.join(root, 'contract', 'contract.snapshot.json');

/** Endpoints the SDK actually calls. Keep in sync with src/modules/**. */
const ENDPOINTS = [
  ['POST', '/api/auth/customers/login'],
  ['POST', '/api/auth/customers/register'],
  ['POST', '/api/auth/customers/google'],
  ['POST', '/api/auth/customers/logout'],
  ['POST', '/api/auth/customers/change-password'],
  ['GET', '/api/auth/customers/me'],
  ['POST', '/api/auth/refresh'],
  ['POST', '/api/customers/verify-email/request'],
  ['GET', '/api/customers/verify-email'],
  ['POST', '/api/customers/password/reset-request'],
  ['POST', '/api/customers/password/reset-confirm'],
  ['POST', '/api/public/restaurants/search'],
  ['GET', '/api/public/restaurants/popular'],
  ['GET', '/api/public/restaurants/cuisines'],
  ['GET', '/api/public/restaurants/{restaurantId}'],
  ['GET', '/api/public/restaurants/{restaurantId}/delivery-check'],
  ['GET', '/api/public/restaurants/{restaurantId}/status'],
  ['GET', '/api/public/restaurants/{restaurantId}/reviews'],
  ['GET', '/api/public/restaurants/{restaurantId}/menu'],
  ['GET', '/api/public/menu/{tenantOrSlug}/{categorySlug}'],
  ['GET', '/api/public/menu/{tenantOrSlug}/{categorySlug}/{productSlug}'],
  ['GET', '/api/public/seo/{tenantOrSlug}/meta'],
  ['GET', '/api/public/seo/{tenantOrSlug}/meta/category/{categorySlug}'],
  ['GET', '/api/public/seo/{tenantOrSlug}/meta/product/{productSlug}'],
  ['GET', '/api/public/testimonials/subdomain/{subdomain}'],
  ['GET', '/api/public/testimonials/{restaurantId}'],
  ['GET', '/api/vitrine/{tenantId}/public'],
  ['GET', '/api/vitrine/resolve-domain'],
  ['GET', '/api/vitrine/{tenantId}/schema.json'],
  ['POST', '/api/public/restaurants/{restaurantId}/orders'],
  ['POST', '/api/public/restaurants/{restaurantId}/orders/estimate-delivery'],
  ['GET', '/api/public/restaurants/{restaurantId}/orders/{orderId}/track'],
  ['POST', '/api/public/restaurants/{restaurantId}/orders/{orderId}/cancel'],
  ['GET', '/api/public/restaurants/{restaurantId}/orders/track-link'],
  ['GET', '/api/public/restaurants/{restaurantId}/orders/menu'],
  ['GET', '/api/public/restaurants/{restaurantId}/orders/settings'],
  ['POST', '/api/public/restaurants/{restaurantId}/orders/reservations'],
  ['GET', '/api/public/restaurants/{restaurantId}/orders/reservations/{reservationNumber}/track'],
  ['POST', '/api/public/restaurants/{restaurantId}/orders/reservations/{reservationNumber}/cancel'],
  ['GET', '/api/public/restaurants/{restaurantId}/tables/{tableId}'],
  ['GET', '/api/customers/me'],
  ['PUT', '/api/customers/me'],
  ['GET', '/api/customers/orders'],
  ['GET', '/api/customers/orders/{orderId}'],
  ['POST', '/api/customers/orders/{orderId}/rate'],
  ['GET', '/api/customers/ratings'],
  ['GET', '/api/customers/referral-code'],
  ['POST', '/api/customers/apply-referral'],
  ['GET', '/api/customers/referrals'],
  ['GET', '/api/notifications/customers/my-inbox'],
  ['GET', '/api/notifications/customers/my-inbox/unread-count'],
  ['PUT', '/api/notifications/customers/my-inbox/{id}/read'],
  ['PUT', '/api/notifications/customers/my-inbox/read-all'],
  ['GET', '/api/customers/menu/categories'],
  ['GET', '/api/customers/menu/products'],
  ['GET', '/api/customers/menu/products/{id}'],
  ['GET', '/api/customers/menu/supplements'],
  ['GET', '/api/customers/menu/garnishes'],
  ['GET', '/api/customers/menu/beverages'],
  ['POST', '/api/customers/testimonials'],
  ['GET', '/api/customers/testimonials'],
  ['POST', '/api/customers/promo/validate'],
  ['GET', '/api/customers/loyalty'],
  ['GET', '/api/customers/loyalty/rewards'],
  ['POST', '/api/customers/loyalty/rewards/{rewardId}/redeem'],
  ['GET', '/api/public/restaurants/{restaurantId}/google-review-info'],
  ['GET', '/api/customers/google-review/status'],
  ['POST', '/api/customers/google-review/claim'],
  ['POST', '/api/customers/google-review/upload-proof'],
  ['GET', '/api/public/deliveries/track/{trackingNumber}'],
  ['POST', '/api/public/live-agent/{restaurantSlug}/session']
];

/** DTOs the SDK types mirror. */
const SCHEMAS = [
  'CustomerAuthResponse',
  'CustomerDto',
  'CustomerRegisterRequest',
  'ChangePasswordRequest',
  'PasswordResetConfirmRequest',
  'VitrineOrderRequest',
  'VitrineOrderItemRequest',
  'CustomerLocation',
  'OrderResponse',
  'TrackOrderResponse',
  'EstimateDeliveryRequest',
  'EstimateDeliveryResponse',
  'CreateReservationRequest',
  'ReservationResponse',
  'PublicTableResponse',
  'PublicTrackingResponse',
  'PublicVitrineResponse',
  'RestaurantSearchRequest',
  'RestaurantSearchResponse',
  'NotificationInboxItemResponse',
  'OrderRatingDTO',
  'LoyaltyReward'
];

function parseArgs(argv) {
  const args = { url: process.env.CONTRACT_OPENAPI_URL ?? 'http://localhost:8080/v3/api-docs', in: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i];
    else if (argv[i] === '--in') args.in = argv[++i];
  }
  return args;
}

async function loadSpec(args) {
  if (args.in) return JSON.parse(fs.readFileSync(args.in, 'utf8'));
  const response = await fetch(args.url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`OpenAPI fetch failed: HTTP ${response.status} (${args.url})`);
  return response.json();
}

/** Merge `allOf`, resolve `$ref` and flatten a schema into properties + required. */
function summarize(schema, depth = 0, components = {}) {
  if (!schema || typeof schema !== 'object' || depth > 6) return null;

  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    const target = components[name];
    const resolved = target && depth < 3 ? summarize(target, depth + 1, components) : null;
    return { ref: name, ...(resolved ?? {}) };
  }

  if (schema.type === 'array') {
    const items = summarize(schema.items, depth + 1, components);
    return { type: 'array', items };
  }

  const merged = { ...schema };
  if (Array.isArray(schema.allOf)) {
    merged.properties = { ...(schema.properties ?? {}) };
    merged.required = [...(schema.required ?? [])];
    for (const part of schema.allOf) {
      const resolved = part?.$ref ? components[part.$ref.split('/').pop()] : part;
      Object.assign(merged.properties, resolved?.properties ?? {});
      if (Array.isArray(resolved?.required)) merged.required.push(...resolved.required);
    }
  }

  const properties = {};
  for (const key of Object.keys(merged.properties ?? {}).sort()) {
    const value = merged.properties[key];
    properties[key] = value?.$ref ? `ref:${value.$ref.split('/').pop()}`
      : value?.type === 'array' ? `array:${value.items?.$ref ? value.items.$ref.split('/').pop() : (value.items?.type ?? 'any')}`
      : (value?.type ?? 'object');
  }

  return {
    required: [...new Set(merged.required ?? [])].sort(),
    properties
  };
}

const args = parseArgs(process.argv.slice(2));
const spec = await loadSpec(args);
const paths = spec.paths ?? {};
const components = spec.components?.schemas ?? {};

const endpoints = {};
const missingEndpoints = [];

// Les noms de paramètres de chemin diffèrent entre le SDK et SpringDoc
// (`{restaurantId}` vs `{restaurantIdentifier}`) : on compare sans eux.
const normalizePath = (value) => value.replace(/\{[^}]+\}/g, '{}');
const pathIndex = new Map(Object.keys(paths).map((key) => [normalizePath(key), key]));

for (const [method, endpoint] of ENDPOINTS) {
  const specPath = pathIndex.get(normalizePath(endpoint));
  const item = specPath ? paths[specPath] : undefined;
  const operation = item?.[method.toLowerCase()];
  if (!operation) {
    missingEndpoints.push(`${method} ${endpoint}`);
    continue;
  }

  const requestSkill = operation.requestBody?.content?.['application/json']?.schema
    ?? operation.requestBody?.content?.['multipart/form-data']?.schema;
  const responseKey = Object.keys(operation.responses ?? {}).find((code) => /^2\d\d$/.test(code));
  const responseSkill = responseKey
    ? operation.responses[responseKey]?.content?.['application/json']?.schema
    : undefined;

  endpoints[`${method} ${endpoint}`] = {
    request: summarize(requestSkill, 0, components),
    response: summarize(responseSkill, 0, components)
  };
}

const schemas = {};
const missingSchemas = [];
for (const name of SCHEMAS) {
  const schema = components[name];
  if (!schema) {
    missingSchemas.push(name);
    continue;
  }
  schemas[name] = summarize(schema, 0, components);
}

const snapshot = {
  // Aucun champ volatil (horodatage, chemin d'entrée) : le fichier doit être
  // identique qu'on le génère depuis un fichier ou depuis l'URL OpenAPI, sinon
  // le job CI de dérive échoue en permanence. La provenance est le commit.
  openapi: spec.openapi ?? null,
  totals: { paths: Object.keys(paths).length, schemas: Object.keys(components).length },
  endpoints,
  schemas,
  missingEndpoints,
  missingSchemas
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`✅ contract snapshot → ${path.relative(process.cwd(), outFile)}`);
console.log(`   endpoints: ${Object.keys(endpoints).length} captured, ${missingEndpoints.length} missing`);
console.log(`   schemas:   ${Object.keys(schemas).length} captured, ${missingSchemas.length} missing`);
if (missingEndpoints.length) console.log(`   ⚠️  ${missingEndpoints.join('\n      ')}`);
if (missingSchemas.length) console.log(`   ⚠️  schemas: ${missingSchemas.join(', ')}`);
