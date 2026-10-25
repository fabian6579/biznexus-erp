import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({
  organization,
  user = null,
  userName = 'System',
  userRole = '',
  action,
  module,
  details = null,
  ipAddress = '',
}) => {
  try {
    await AuditLog.create({
      organization,
      user,
      userName,
      userRole,
      action,
      module,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('[Audit Log Failed]:', error.message);
  }
};
