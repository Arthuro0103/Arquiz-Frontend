// Participant Management Service for WebSocket
// Extracted from oversized WebSocketContext.tsx for better maintainability

import type {
  ParticipantData,
  ExtendedParticipantData,
  ParticipantStatus,
  UserRole
} from '../../types/websocket.types';

import {
  extractParticipantName,
  normalizeParticipantId,
  isParticipantMatch,
  mergeParticipants,
  removeParticipantById,
  createWebSocketLogger
} from './websocket-utils';

// Participant Management Class
export class ParticipantManager {
  private readonly logger: ReturnType<typeof createWebSocketLogger>;
  
  constructor(debugMode = false) {
    this.logger = createWebSocketLogger(debugMode);
  }

  /**
   * Filters and processes participants based on user role and visibility rules
   */
  public filterParticipants(
    participants: ExtendedParticipantData[],
    currentUserId?: string,
    isTeacher = false
  ): ParticipantData[] {
    this.logger.debug('FILTER_PARTICIPANTS START:', {
      inputParticipants: participants.length,
      currentUserId,
      isTeacher,
      participants: participants.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        role: p.role,
        isHost: p.isHost,
        status: p.status
      }))
    });

    // Step 1: Deduplicate participants
    const deduplicatedParticipants = this.deduplicateParticipants(participants);
    
    this.logger.debug('DEDUPLICATION COMPLETE:', {
      originalCount: participants.length,
      deduplicatedCount: deduplicatedParticipants.length,
      duplicatesRemoved: participants.length - deduplicatedParticipants.length
    });

    // Step 2: Apply role-based filtering
    const filteredParticipants = this.applyRoleBasedFiltering(
      deduplicatedParticipants,
      isTeacher
    );

    // Step 3: Map to standard format
    const result = filteredParticipants.map(p => this.mapToStandardFormat(p));

    this.logger.debug('FILTER_PARTICIPANTS END:', {
      inputCount: participants.length,
      outputCount: result.length,
      isTeacher,
      currentUserId,
      result: result.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        status: p.status,
        role: p.role,
        isHost: p.isHost
      }))
    });

    return result;
  }

  /**
   * Adds a new participant to the existing list
   */
  public addParticipant(
    existingParticipants: ParticipantData[],
    newParticipant: ParticipantData
  ): ParticipantData[] {
    // Check if participant already exists
    const existingIndex = existingParticipants.findIndex(p =>
      isParticipantMatch(p, newParticipant)
    );

    if (existingIndex >= 0) {
      // Update existing participant
      const updated = [...existingParticipants];
      updated[existingIndex] = { ...updated[existingIndex], ...newParticipant };
      return updated;
    }

    // Add new participant
    return [...existingParticipants, newParticipant];
  }

  /**
   * Removes a participant from the list
   */
  public removeParticipant(
    existingParticipants: ParticipantData[],
    participantId: string
  ): ParticipantData[] {
    return removeParticipantById(existingParticipants, participantId);
  }

  /**
   * Updates participant status
   */
  public updateParticipantStatus(
    existingParticipants: ParticipantData[],
    participantId: string,
    status: ParticipantStatus
  ): ParticipantData[] {
    return existingParticipants.map(participant => {
      if (normalizeParticipantId(participant) === participantId || participant.id === participantId) {
        return {
          ...participant,
          status,
          lastActivity: new Date().toISOString()
        };
      }
      return participant;
    });
  }

  /**
   * Merges participants from different sources
   */
  public mergeParticipantLists(
    existing: ParticipantData[],
    incoming: ParticipantData[]
  ): ParticipantData[] {
    return mergeParticipants(existing, incoming);
  }

  /**
   * Validates participant data structure
   */
  public validateParticipant(data: unknown): data is ParticipantData {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof (data as any).id === 'string' &&
      typeof (data as any).name === 'string' &&
      typeof (data as any).email === 'string'
    );
  }

  /**
   * Gets participant by ID
   */
  public getParticipantById(
    participants: ParticipantData[],
    participantId: string
  ): ParticipantData | null {
    return participants.find(p =>
      normalizeParticipantId(p) === participantId || p.id === participantId
    ) || null;
  }

  /**
   * Gets participant count by status
   */
  public getParticipantCountByStatus(
    participants: ParticipantData[]
  ): Record<ParticipantStatus, number> {
    return participants.reduce((counts, participant) => {
      counts[participant.status] = (counts[participant.status] || 0) + 1;
      return counts;
    }, {} as Record<ParticipantStatus, number>);
  }

  /**
   * Gets participants by role
   */
  public getParticipantsByRole(
    participants: ParticipantData[],
    role: UserRole
  ): ParticipantData[] {
    return participants.filter(p => p.role === role);
  }

  // Private helper methods

  private deduplicateParticipants(
    participants: ExtendedParticipantData[]
  ): ExtendedParticipantData[] {
    return participants.reduce((acc: ExtendedParticipantData[], current) => {
      const existingIndex = acc.findIndex(existing => {
        return (
          (current.id && existing.id === current.id) ||
          (current.userId && existing.userId === current.userId) ||
          (current.email && existing.email === current.email && current.email !== '') ||
          (current.name && existing.name === current.name && current.name !== '' && current.name !== 'Unknown')
        );
      });

      if (existingIndex >= 0) {
        // Update existing participant with latest data
        this.logger.debug('UPDATING EXISTING PARTICIPANT:', {
          existing: acc[existingIndex],
          new: current,
          updateReason: 'duplicate_found'
        });
        acc[existingIndex] = { 
          ...acc[existingIndex], 
          ...current, 
          status: current.status || acc[existingIndex].status 
        };
      } else {
        // Add new participant
        acc.push(current);
      }
      
      return acc;
    }, []);
  }

  private applyRoleBasedFiltering(
    participants: ExtendedParticipantData[],
    isTeacher: boolean
  ): ExtendedParticipantData[] {
    return participants.filter(p => {
      this.logger.debug('FILTERING PARTICIPANT:', {
        participant: {
          id: p.id,
          userId: p.userId,
          name: p.name,
          email: p.email,
          role: p.role,
          isHost: p.isHost,
          status: p.status
        },
        filterLogic: {
          isTeacher,
          participantRole: p.role,
          participantIsHost: p.isHost,
          isTeacherOrHost: p.role === 'teacher' || p.isHost,
          decision: isTeacher ? 'SHOW_ALL_TO_TEACHER' : (p.role === 'teacher' || p.isHost ? 'HIDE_TEACHER_FROM_STUDENT' : 'SHOW_STUDENT')
        }
      });

      // Teachers see all participants (including other teachers)
      if (isTeacher) {
        this.logger.debug('TEACHER SEES ALL - INCLUDE:', p.name || p.email);
        return true;
      }
      
      // Students don't see teachers/hosts in participant list
      if (p.role === 'teacher' || p.isHost) {
        this.logger.debug('STUDENT HIDE TEACHER - EXCLUDE:', p.name || p.email);
        return false;
      }
      
      this.logger.debug('STUDENT SEES STUDENT - INCLUDE:', p.name || p.email);
      return true;
    });
  }

  private mapToStandardFormat(participant: ExtendedParticipantData): ParticipantData {
    // Map backend status to frontend status
    const mappedStatus = this.mapParticipantStatus(participant.status);

    const mappedParticipant: ParticipantData = {
      id: normalizeParticipantId(participant),
      userId: participant.userId,
      name: extractParticipantName(participant),
      email: participant.email || '',
      status: mappedStatus,
      score: participant.score || 0,
      currentQuestionIndex: participant.currentQuestionIndex || 0,
      lastActivity: participant.lastActivity || new Date().toISOString(),
      role: participant.role,
      isHost: participant.isHost
    };

    this.logger.debug('MAPPED PARTICIPANT:', {
      original: {
        id: participant.id,
        userId: participant.userId,
        name: participant.name,
        email: participant.email,
        status: participant.status,
        role: participant.role,
        isHost: participant.isHost
      },
      mapped: mappedParticipant
    });

    return mappedParticipant;
  }

  private mapParticipantStatus(status?: string): ParticipantStatus {
    if (!status) return 'disconnected';
    
    switch (status.toLowerCase()) {
      case 'connected':
      case 'online':
      case 'active':
      case 'joined':
        return 'connected';
      case 'answering':
      case 'responding':
        return 'answering';
      case 'finished':
      case 'completed':
        return 'finished';
      default:
        return 'disconnected';
    }
  }
} 