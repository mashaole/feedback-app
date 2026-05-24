/**
 * Serialized API error payloads (transport layer). Shared between server serialization
 * and browser client parsing — no server/domain imports allowed here.
 */

export interface ValidationDetailField {
  field: string;
  message: string;
}
