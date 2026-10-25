import { Notification } from '../models/Notification.js';

export const createNotification = async (orgId, {
  title,
  message,
  type = 'system',
  user = null,
  role = null,
  link = '',
  metadata = null,
}) => {
  try {
    const notification = await Notification.create({
      organization: orgId,
      user,
      role,
      title,
      message,
      type,
      link,
      metadata,
    });
    return notification;
  } catch (error) {
    console.error('[Notification Creation Failed]:', error.message);
  }
};
