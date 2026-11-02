export type Role = 'client' | 'receptionist' | 'admin';
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
  mustChangePassword?: boolean;
}
export interface Pricing {
  nights: number;
  nightlyRateMinor: number;
  packagePriceMinor: number;
  totalMinor: number;
  currency: string;
}
export interface Room {
  id: string;
  number: string;
  type: string;
  description?: string;
  capacity: number;
  nightlyRateMinor: number;
  equipment: string[];
  active: boolean;
  pricing?: Pricing;
}
export interface PackageItem {
  id?: string;
  name: string;
  partner: 'A' | 'B' | 'HOTEL';
  offerId: string;
  quantity: number;
}
export interface StayPackage {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  active: boolean;
  items: PackageItem[];
}
export interface Reservation {
  id: string;
  number: string;
  roomId: string;
  room?: Room;
  roomNumber?: string;
  packageId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestNames: string[];
  guest: { name: string; email: string; phone: string };
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  status: string;
  pricing: Pricing;
  version: number;
  fundingSource: string;
  voucherReference?: string;
  hotelComponentId?: string;
  items?: PlanItem[];
}
export interface PlanItem {
  id: string;
  name: string;
  partner: string;
  offerId: string;
  quantity?: number;
  guestIndex?: number;
  status: string;
  note?: string;
  bookings?: PartnerBooking[];
}
export interface PartnerBooking {
  id: string;
  itemId: string;
  partner: string;
  startsAt: string;
  endsAt: string;
  status: string;
  externalId?: string;
  operationId?: string;
  guestIndex?: number;
  lastError?: string;
  error?: string;
}
export interface StayPlan {
  items: PlanItem[];
  bookings?: PartnerBooking[];
  voucher?: { status: string; lastError?: string; error?: string };
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export type Partner = 'A' | 'B' | 'D';
export interface Integration {
  partner: Partner;
  enabled: boolean;
  mode: 'demo' | 'real';
  baseUrl: string;
  timeoutMs: number;
  hasSecret?: boolean;
  secret?: string;
  lastTestAt?: string;
  lastTestResult?: string;
  authHeader?: 'X-API-Key' | 'Authorization';
  demoScenario?: string;
}
export interface ApiKey {
  id: string;
  name: string;
  partner: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
}
export interface AuditEvent {
  id: string;
  createdAt: string;
  actor: string;
  actorName?: string;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: unknown;
}
