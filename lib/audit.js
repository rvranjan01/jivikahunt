/**
 * @file lib/audit.js
 * @description Helper for writing immutable audit events to the AuditLog collection.
 */

import { connectToDatabase } from './db';
import AuditLog from '@/models/AuditLog';

/**
 * Persists an administrative or security action into the audit trail.
 * @param {Object} entry
 * @param {string} entry.action - Action identifier (e.g., 'login.success', 'user.create', 'user.deactivate')
 * @param {string} [entry.actorId] - User ObjectId
 * @param {string} [entry.actorEmail] - User email
 * @param {string} [entry.targetType] - Entity affected ('User', 'Job', 'Report')
 * @param {string} [entry.targetId] - Target entity identifier
 * @param {Object} [entry.metadata] - Additional sanitized action details
 * @param {string} [entry.ipHash] - Client IP hash
 */
export async function recordAuditLog({
  action,
  actorId = null,
  actorEmail = null,
  targetType = null,
  targetId = null,
  metadata = {},
  ipHash = null,
}) {
  try {
    await connectToDatabase();
    await AuditLog.create({
      action,
      actorId,
      actorEmail,
      targetType,
      targetId,
      metadata,
      ipHash,
    });
  } catch (err) {
    // Non-blocking error handling to ensure primary user operation does not fail
    console.error(`Failed to record audit log [${action}]:`, err.message);
  }
}
