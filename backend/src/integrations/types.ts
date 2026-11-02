import { AppError } from '../errors.js';
export type Partner = 'A' | 'B' | 'D';
export interface Integration {
  partner: Partner;
  mode: 'demo' | 'real';
  enabled: number;
  baseUrl: string;
  secret: string;
  timeoutMs: number;
  authHeader: string;
  demoScenario: string;
  lastTestAt: string | null;
  lastTestResult: string | null;
}
export interface ReservationForIntegration {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guestNames: string | string[];
  voucherReference?: string | null;
  hotelComponentId?: string | null;
  fundingSource?: string;
}
export interface Booking {
  id: string;
  reservationId: string;
  itemId: string;
  partner: 'A' | 'B';
  guestIndex: number;
  offerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  operationId: string;
  cancelOperationId: string | null;
  externalId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface RemoteBooking {
  id: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  startsAt: string;
  endsAt: string;
  operationId: string;
}
export interface VoucherResult {
  valid: boolean;
  provider: string;
  kind: string;
  componentId: string;
  used: boolean;
  reservationId: string | null;
  validFrom: string;
  validUntil: string;
  reference: string;
}
export class IntegrationError extends AppError {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public uncertain = false,
  ) {
    super(status, code, message);
  }
}
