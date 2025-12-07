/**
 * Palabra API Client for React Native
 * Handles session management via REST API
 */

import {
  PalabraAuth,
  ClientCredentialsAuth,
  UserTokenAuth,
  ApiResponse,
  SessionResponse,
  SessionListResponse,
  CreateSessionPayload,
} from './types';

const DEFAULT_BASE_URL = 'https://api.palabra.ai';

export class PalabraApiClient {
  private baseUrl: string;
  private clientId: string = '';
  private clientSecret: string = '';
  private authToken?: string;
  private readonly intent?: string;

  constructor(
    auth: PalabraAuth,
    baseUrl: string = DEFAULT_BASE_URL,
    intent?: string
  ) {
    this.baseUrl = baseUrl;
    this.initAuth(auth);
    this.intent = intent;

    if (!this.authToken && (!this.clientId || !this.clientSecret)) {
      throw new Error(
        'ClientId and ClientSecret are required for API call! Pass them into constructor'
      );
    }
  }

  private initAuth(auth: ClientCredentialsAuth | UserTokenAuth): void {
    if ('userToken' in auth) {
      this.authToken = auth.userToken;
    } else {
      this.clientId = 'clientId' in auth ? auth.clientId : '';
      this.clientSecret = 'clientSecret' in auth ? auth.clientSecret : '';
    }
  }

  private baseHeaders(): Record<string, string> {
    if (this.authToken) {
      return {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      ClientId: this.clientId,
      ClientSecret: this.clientSecret,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a streaming session for real-time translation
   * Documentation: https://docs.palabra.ai/docs/quick-start#step-2-create-a-streaming-session
   */
  async createStreamingSession(): Promise<ApiResponse<SessionResponse>> {
    const payload: CreateSessionPayload = {
      data: {
        publisher_count: 1,
        subscriber_count: 0,
        publisher_can_subscribe: true,
        intent: this.intent,
      },
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/session-storage/session`,
        {
          method: 'POST',
          headers: this.baseHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const data: ApiResponse<SessionResponse> = await response.json();

      if (!data.ok) {
        throw new Error(`Session creation failed: ${JSON.stringify(data.errors)}`);
      }

      console.log('[PalabraApiClient] Session created:', data.data?.id);
      return data;
    } catch (error) {
      console.error('[PalabraApiClient] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Delete a streaming session
   */
  async deleteStreamingSession(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('SessionId is required for deleteStreamingSession');
    }

    try {
      await fetch(
        `${this.baseUrl}/session-storage/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: this.baseHeaders(),
        }
      );
      console.log('[PalabraApiClient] Session deleted:', sessionId);
    } catch (error) {
      console.error('[PalabraApiClient] Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Fetch all active sessions for the authenticated user
   */
  async fetchActiveSessions(): Promise<ApiResponse<SessionListResponse> | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/session-storage/sessions`,
        {
          headers: this.baseHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<SessionListResponse> = await response.json();
      console.log(
        '[PalabraApiClient] Active sessions:',
        data.data?.sessions?.length ?? 0
      );
      return data;
    } catch (error) {
      console.error('[PalabraApiClient] Failed to fetch sessions:', error);
      return null;
    }
  }

  /**
   * Clean up all active sessions (useful for cleanup)
   */
  async cleanupAllSessions(): Promise<void> {
    try {
      const sessionsResponse = await this.fetchActiveSessions();
      const sessions = sessionsResponse?.data?.sessions;

      if (sessions && sessions.length > 0) {
        console.log(
          `[PalabraApiClient] Cleaning up ${sessions.length} active sessions`
        );
        await Promise.all(
          sessions.map((session) => this.deleteStreamingSession(session.id))
        );
        console.log('[PalabraApiClient] All sessions cleaned up');
      }
    } catch (error) {
      console.error('[PalabraApiClient] Failed to cleanup sessions:', error);
    }
  }
}
