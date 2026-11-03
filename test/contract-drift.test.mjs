/**
 * Backend contract drift guard.
 *
 * `contract/contract.snapshot.json` is generated from the backend's OpenAPI
 * document (`npm run contract:snapshot`). These tests fail when the backend
 * changes something the SDK depends on, so the drift is caught in CI instead
 * of in a later audit.
 *
 * Refresh the snapshot after an intentional backend change:
 *   npm run contract:snapshot -- --url https://api.restorino.com/v3/api-docs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(
  fs.readFileSync(path.join(root, 'contract', 'contract.snapshot.json'), 'utf8')
);

test('Contract: snapshot covers every endpoint the SDK calls', () => {
  assert.deepEqual(snapshot.missingEndpoints, [], 'SDK calls endpoints absent from the backend spec');
  assert.deepEqual(snapshot.missingSchemas, [], 'SDK mirrors schemas absent from the backend spec');
  assert.ok(Object.keys(snapshot.endpoints).length >= 70, 'snapshot looks truncated');
});

test('Contract: critical order endpoints still exist', () => {
  const required = [
    'POST /api/public/restaurants/{restaurantId}/orders',
    'POST /api/public/restaurants/{restaurantId}/orders/estimate-delivery',
    'GET /api/public/restaurants/{restaurantId}/orders/{orderId}/track',
    'POST /api/public/restaurants/{restaurantId}/orders/reservations',
    'GET /api/customers/orders',
    'GET /api/public/deliveries/track/{trackingNumber}',
    'POST /api/public/live-agent/{restaurantSlug}/session',
    'POST /api/auth/customers/login',
    'POST /api/customers/loyalty/rewards/{rewardId}/redeem'
  ];

  for (const endpoint of required) {
    assert.ok(snapshot.endpoints[endpoint], `missing from spec: ${endpoint}`);
  }
});

test('Contract: order payload fields the SDK sends still exist', () => {
  const order = snapshot.schemas.VitrineOrderRequest;
  assert.ok(order, 'VitrineOrderRequest schema disappeared');

  for (const field of ['deliveryMethod', 'paymentMethod', 'customerEmail', 'customerPhone', 'items']) {
    assert.ok(order.required.includes(field), `VitrineOrderRequest.${field} is no longer required`);
    assert.ok(field in order.properties, `VitrineOrderRequest.${field} is no longer a property`);
  }

  // `orderType`, `deliveryLocation` and `street` must never reappear as the
  // source of truth: the SDK sends `deliveryMethod`, `customerLocation`/`address`.
  assert.ok(!('orderType' in order.properties), 'orderType reappeared in the request DTO');

  const item = snapshot.schemas.VitrineOrderItemRequest;
  assert.ok(item.required.includes('totalPrice'), 'item.totalPrice is no longer required');
  assert.ok('supplements' in item.properties, 'item.supplements disappeared');
});

test('Contract: response field names the SDK reads still exist', () => {
  const expectations = [
    ['OrderResponse', ['total', 'subtotal', 'tax', 'deliveryFee', 'orderType', 'trackingUrl']],
    ['TrackOrderResponse', ['orderId', 'status', 'canBeCancelled']],
    ['PublicTrackingResponse', ['deliveryStatus', 'driverLatitude', 'driverLongitude', 'progressSteps']],
    ['PublicVitrineResponse', ['restaurantId', 'cuisineType', 'coverImageUrl']],
    ['RestaurantSearchResponse', ['restaurantId', 'distanceKm', 'canDeliver']],
    ['OrderRatingDTO', ['overallRating', 'reviewText']],
    ['LoyaltyReward', ['pointsRequired', 'rewardType', 'discountAmount']],
    ['NotificationInboxItemResponse', ['notificationType', 'isRead', 'actionButtonUrl']],
    ['PublicTableResponse', ['tableNumber', 'tableSessionToken', 'status']],
    ['ReservationResponse', ['numberOfGuests', 'reservationDate', 'status']]
  ];

  for (const [schemaName, fields] of expectations) {
    const schema = snapshot.schemas[schemaName];
    assert.ok(schema, `${schemaName} schema disappeared`);
    for (const field of fields) {
      assert.ok(field in schema.properties, `${schemaName}.${field} disappeared from the backend DTO`);
    }
  }
});

test('Contract: request DTO fields the SDK sends still exist', () => {
  // Note: springdoc does not emit a `required` array for every DTO (the register
  // and password DTOs have none despite @NotBlank), so property existence is the
  // reliable signal. Where `required` IS emitted it is asserted separately.
  const expectations = [
    ['CustomerRegisterRequest', 'firstName'],
    ['CustomerRegisterRequest', 'lastName'],
    ['CustomerRegisterRequest', 'phone'],
    ['ChangePasswordRequest', 'confirmPassword'],
    ['PasswordResetConfirmRequest', 'resetCode'],
    ['CustomerLocation', 'latitude'],
    ['CustomerLocation', 'longitude'],
    ['CustomerLocation', 'address'],
    ['CreateReservationRequest', 'numberOfGuests'],
    ['CreateReservationRequest', 'reservationDate'],
    ['EstimateDeliveryRequest', 'address']
  ];

  for (const [schemaName, field] of expectations) {
    const schema = snapshot.schemas[schemaName];
    assert.ok(schema, `${schemaName} schema disappeared`);
    assert.ok(
      field in schema.properties,
      `${schemaName}.${field} was renamed or removed server-side; the SDK type is stale`
    );
  }
});

test('Contract: required-field guarantees hold where springdoc emits them', () => {
  const order = snapshot.schemas.VitrineOrderRequest;
  assert.ok(order.required.includes('deliveryMethod'), 'deliveryMethod is no longer required');
  assert.ok(order.required.includes('items'), 'items is no longer required');

  const item = snapshot.schemas.VitrineOrderItemRequest;
  assert.ok(item.required.includes('totalPrice'), 'item.totalPrice is no longer required');
  assert.ok(item.required.includes('unitPrice'), 'item.unitPrice is no longer required');
});

test('Contract: field types still match what the SDK declares', () => {
  const expected = [
    ['OrderResponse', 'total', 'number'],
    ['OrderResponse', 'subtotal', 'number'],
    ['OrderResponse', 'tax', 'number'],
    ['OrderResponse', 'status', 'string'],
    ['PublicTrackingResponse', 'deliveryStatus', 'string'],
    ['PublicTrackingResponse', 'driverLatitude', 'number'],
    ['PublicTableResponse', 'tableNumber', 'integer'],
    ['PublicTableResponse', 'isActive', 'boolean'],
    ['LoyaltyReward', 'pointsRequired', 'integer'],
    ['VitrineOrderItemRequest', 'unitPrice', 'number'],
    ['VitrineOrderItemRequest', 'totalPrice', 'number'],
    ['VitrineOrderItemRequest', 'quantity', 'integer']
  ];

  for (const [schemaName, field, expectedType] of expected) {
    const actual = snapshot.schemas[schemaName]?.properties?.[field];
    assert.equal(
      actual,
      expectedType,
      `${schemaName}.${field} changed type server-side; the SDK declaration is stale`
    );
  }
});

test('Contract: search filters keep the names the SDK sends', () => {
  const search = snapshot.schemas.RestaurantSearchRequest;
  assert.ok(search, 'RestaurantSearchRequest schema disappeared');
  assert.ok('searchTerm' in search.properties, 'searchTerm renamed');
  assert.ok('cuisineType' in search.properties, 'cuisineType renamed');
  assert.ok(!('query' in search.properties), 'query reappeared in the search DTO');
});
