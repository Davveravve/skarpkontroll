// src/services/teamLogger.js - Team activity logging service
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Log types for team activities
 */
export const LOG_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  EXPORTED: 'exported',
  JOINED: 'joined',
  LEFT: 'left',
  UPLOADED: 'uploaded',
  COMPLETED: 'completed'
};

export const LOG_ENTITIES = {
  CUSTOMER: 'customer',
  CONTROL: 'control',
  NODE: 'node',
  REMARK: 'remark',
  TEAM: 'team',
  PDF: 'pdf',
  IMAGE: 'image',
  KONTROLLPUNKT: 'kontrollpunkt'
};

/**
 * Log a team activity
 * @param {Object} params - Log parameters
 * @param {string} params.teamId - Team ID
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.userName - Display name of the user
 * @param {string} params.action - Action type (created, updated, deleted, etc.)
 * @param {string} params.entityType - Type of entity (customer, control, etc.)
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.entityName - Name/title of the entity
 * @param {string} [params.details] - Additional details
 * @param {string} [params.parentName] - Parent entity name (e.g., customer name for a control)
 */
export const logTeamActivity = async ({
  teamId,
  userId,
  userName,
  action,
  entityType,
  entityId,
  entityName,
  details = null,
  parentName = null
}) => {
  if (!teamId || !userId) {
    console.warn('logTeamActivity: Missing teamId or userId');
    return null;
  }

  try {
    const logEntry = {
      teamId,
      userId,
      userName: userName || 'Unknown',
      action,
      entityType,
      entityId: entityId || null,
      entityName: entityName || 'Unknown',
      details,
      parentName,
      timestamp: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'teamLogs'), logEntry);
    console.log('Activity logged:', action, entityType, entityName);
    return docRef.id;
  } catch (error) {
    console.error('Error logging team activity:', error);
    return null;
  }
};

/**
 * Create a logger instance bound to current user and team
 * @param {Object} context - Context with team and user info
 * @param {string} context.teamId - Team ID
 * @param {string} context.userId - User ID
 * @param {string} context.userName - User display name
 */
export const createTeamLogger = ({ teamId, userId, userName }) => {
  return {
    log: (action, entityType, entityId, entityName, details = null, parentName = null) => {
      return logTeamActivity({
        teamId,
        userId,
        userName,
        action,
        entityType,
        entityId,
        entityName,
        details,
        parentName
      });
    },

    // Convenience methods
    customerCreated: (id, name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.CREATED, entityType: LOG_ENTITIES.CUSTOMER, entityId: id, entityName: name }),

    customerUpdated: (id, name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.UPDATED, entityType: LOG_ENTITIES.CUSTOMER, entityId: id, entityName: name }),

    customerDeleted: (name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.DELETED, entityType: LOG_ENTITIES.CUSTOMER, entityName: name }),

    controlCreated: (id, name, customerName) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.CREATED, entityType: LOG_ENTITIES.CONTROL, entityId: id, entityName: name, parentName: customerName }),

    controlUpdated: (id, name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.UPDATED, entityType: LOG_ENTITIES.CONTROL, entityId: id, entityName: name }),

    controlCompleted: (id, name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.COMPLETED, entityType: LOG_ENTITIES.CONTROL, entityId: id, entityName: name }),

    controlDeleted: (name) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.DELETED, entityType: LOG_ENTITIES.CONTROL, entityName: name }),

    pdfExported: (controlName) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.EXPORTED, entityType: LOG_ENTITIES.PDF, entityName: controlName }),

    remarkCreated: (nodeName, priority = null) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.CREATED, entityType: LOG_ENTITIES.REMARK, entityName: nodeName, details: priority ? `Prioritet ${priority}` : null }),

    remarkUpdated: (nodeName) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.UPDATED, entityType: LOG_ENTITIES.REMARK, entityName: nodeName }),

    imageUploaded: (controlName, count = 1) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.UPLOADED, entityType: LOG_ENTITIES.IMAGE, entityName: controlName, details: count > 1 ? `${count} bilder` : null }),

    memberJoined: (memberName) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.JOINED, entityType: LOG_ENTITIES.TEAM, entityName: memberName }),

    memberLeft: (memberName) =>
      logTeamActivity({ teamId, userId, userName, action: LOG_ACTIONS.LEFT, entityType: LOG_ENTITIES.TEAM, entityName: memberName })
  };
};

const teamLoggerExports = { logTeamActivity, createTeamLogger, LOG_ACTIONS, LOG_ENTITIES };
export default teamLoggerExports;
