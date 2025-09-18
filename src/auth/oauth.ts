// OAuth authentication integration for Cloudflare Agents SDK
// Provides OAuth 2.0 flow using Cloudflare Workers OAuth Provider

// Simple logging functions (will be replaced with proper logging module)
function logInfo(message: string, context: any = {}): void {
  console.log(JSON.stringify({ level: 'INFO', message, ...context, timestamp: new Date().toISOString() }));
}

function logError(message: string, context: any = {}): void {
  console.error(JSON.stringify({ level: 'ERROR', message, ...context, timestamp: new Date().toISOString() }));
}

function logWarning(message: string, context: any = {}): void {
  console.warn(JSON.stringify({ level: 'WARNING', message, ...context, timestamp: new Date().toISOString() }));
}

export interface OAuthConfig {
  provider: string;
  client_id: string;
  scopes: string[];
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface OAuthUser {
  id: string;
  email?: string;
  name?: string;
  scopes: string[];
}

export class OAuthManager {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.provider || this.config.provider !== 'cloudflare') {
      throw new Error('Only Cloudflare OAuth provider is supported');
    }
    if (!this.config.client_id) {
      throw new Error('Client ID is required');
    }
    if (!Array.isArray(this.config.scopes) || this.config.scopes.length === 0) {
      throw new Error('At least one scope is required');
    }
  }

  /**
   * Initiate OAuth authorization flow
   */
  async initiateAuthorization(
    redirectUri: string,
    state?: string,
    additionalScopes?: string[]
  ): Promise<{ authorization_url: string; state: string }> {
    try {
      const scopes = [...this.config.scopes, ...(additionalScopes || [])];
      const scopeString = scopes.join(' ');

      // Generate state if not provided
      const authState = state || crypto.randomUUID();

      // Build authorization URL for Cloudflare OAuth
      const baseUrl = 'https://dash.cloudflare.com/oauth2/authorize';
      const params = new URLSearchParams({
        client_id: this.config.client_id,
        redirect_uri: redirectUri,
        scope: scopeString,
        response_type: 'code',
        state: authState
      });

      const authorizationUrl = `${baseUrl}?${params.toString()}`;

      logInfo('OAuth authorization initiated', {
        client_id: this.config.client_id,
        scopes: scopeString,
        state: authState
      });

      return {
        authorization_url: authorizationUrl,
        state: authState
      };
    } catch (error) {
      logError('OAuth authorization initiation failed', { error: error as Error });
      throw new Error('Failed to initiate OAuth authorization');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<OAuthToken> {
    try {
      const tokenUrl = 'https://dash.cloudflare.com/oauth2/token';

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.client_id,
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('OAuth token exchange failed', {
          status: response.status,
          error: errorText
        });
        throw new Error(`OAuth token exchange failed: ${response.status}`);
      }

      const tokenData = await response.json() as OAuthToken;

      logInfo('OAuth token exchanged successfully', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      });

      return tokenData;
    } catch (error) {
      logError('OAuth token exchange error', { error: error as Error });
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Validate OAuth access token
   */
  async validateToken(accessToken: string): Promise<{ valid: boolean; user?: OAuthUser }> {
    try {
      // For Cloudflare OAuth, we can validate tokens by making a request to the userinfo endpoint
      const userinfoUrl = 'https://dash.cloudflare.com/oauth2/userinfo';

      const response = await fetch(userinfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        logWarning('OAuth token validation failed', {
          status: response.status,
          token_valid: false
        });
        return { valid: false };
      }

      const userData = await response.json() as any;

      const user: OAuthUser = {
        id: userData.sub || userData.id,
        email: userData.email,
        name: userData.name,
        scopes: this.config.scopes // In a real implementation, you'd get scopes from the token
      };

      logInfo('OAuth token validated successfully', {
        user_id: user.id,
        token_valid: true
      });

      return { valid: true, user };
    } catch (error) {
      logError('OAuth token validation error', { error: error as Error });
      return { valid: false };
    }
  }

  /**
   * Refresh OAuth access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    try {
      const tokenUrl = 'https://dash.cloudflare.com/oauth2/token';

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.client_id,
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('OAuth token refresh failed', {
          status: response.status,
          error: errorText
        });
        throw new Error(`OAuth token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json() as OAuthToken;

      logInfo('OAuth token refreshed successfully', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      });

      return tokenData;
    } catch (error) {
      logError('OAuth token refresh error', { error: error as Error });
      throw new Error('Failed to refresh OAuth token');
    }
  }

  /**
   * Check if user has required scopes
   */
  hasRequiredScopes(userScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.every(scope => userScopes.includes(scope));
  }
}

// Default OAuth configuration
export const DEFAULT_OAUTH_CONFIG: OAuthConfig = {
  provider: 'cloudflare',
  client_id: 'legco-search-mcp',
  scopes: ['read', 'write']
};

// Global OAuth manager instance
let oauthManager: OAuthManager | null = null;

/**
 * Initialize OAuth manager
 */
export function initializeOAuth(config: OAuthConfig = DEFAULT_OAUTH_CONFIG): OAuthManager {
  oauthManager = new OAuthManager(config);
  logInfo('OAuth manager initialized', {
    provider: config.provider,
    client_id: config.client_id,
    scopes: config.scopes
  });
  return oauthManager;
}

/**
 * Get OAuth manager instance
 */
export function getOAuthManager(): OAuthManager {
  if (!oauthManager) {
    throw new Error('OAuth manager not initialized. Call initializeOAuth() first.');
  }
  return oauthManager;
}

/**
 * Middleware function for OAuth authentication
 */
export async function requireOAuth(request: Request, requiredScopes: string[] = []): Promise<{ user: OAuthUser; token: string } | null> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const manager = getOAuthManager();

    const validation = await manager.validateToken(token);

    if (!validation.valid || !validation.user) {
      return null;
    }

    // Check if user has required scopes
    if (requiredScopes.length > 0 && !manager.hasRequiredScopes(validation.user.scopes, requiredScopes)) {
      logWarning('OAuth user missing required scopes', {
        user_id: validation.user.id,
        user_scopes: validation.user.scopes,
        required_scopes: requiredScopes
      });
      return null;
    }

    return { user: validation.user, token };
  } catch (error) {
    logError('OAuth authentication error', { error: error as Error });
    return null;
  }
}