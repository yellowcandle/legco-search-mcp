// Resource Subscriptions and Notifications for MCP 2025-06-18
// Implements resource subscription management and real-time notifications

import { z } from "zod";

// Resource subscription types
export interface ResourceSubscription {
  uri: string;
  clientId: string;
  subscribedAt: string;
  lastNotified?: string;
  notificationCount: number;
}

export interface ResourceNotification {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
  annotations?: {
    audience?: string[];
    priority?: number;
    lastModified?: string;
  };
}

// Resource subscription schemas
export const subscribeResourceSchema = {
  uri: z.string().describe("The URI of the resource to subscribe to")
};

export const unsubscribeResourceSchema = {
  uri: z.string().describe("The URI of the resource to unsubscribe from")
};

export const listResourceTemplatesSchema = {};

export const readResourceSchema = {
  uri: z.string().describe("The URI of the resource to read")
};

// Available resource templates
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "legco://voting/{meeting_type}/{date}",
    name: "Voting Results by Meeting",
    description: "Access voting results for specific meeting types and dates",
    mimeType: "application/json"
  },
  {
    uriTemplate: "legco://bills/{year}/{gazette_date}",
    name: "Bills by Year and Gazette Date",
    description: "Access bills filtered by year and gazette publication date",
    mimeType: "application/json"
  },
  {
    uriTemplate: "legco://questions/{type}/{year}",
    name: "Questions by Type and Year",
    description: "Access oral/written questions filtered by type and year",
    mimeType: "application/json"
  },
  {
    uriTemplate: "legco://hansard/{type}/{meeting_date}",
    name: "Hansard Records by Type and Date",
    description: "Access Hansard records filtered by type and meeting date",
    mimeType: "application/json"
  },
  {
    uriTemplate: "legco://health",
    name: "Server Health Status",
    description: "Real-time server health and performance metrics",
    mimeType: "application/json"
  }
];

export class ResourceSubscriptionManager {
  private subscriptions: Map<string, ResourceSubscription[]> = new Map();
  private notificationQueue: ResourceNotification[] = [];
  private maxNotificationsPerClient = 100;

  /**
   * Subscribe a client to a resource
   */
  subscribe(clientId: string, uri: string): boolean {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, []);
    }

    const subscribers = this.subscriptions.get(uri)!;

    // Check if already subscribed
    if (subscribers.some(sub => sub.clientId === clientId)) {
      return false; // Already subscribed
    }

    const subscription: ResourceSubscription = {
      uri,
      clientId,
      subscribedAt: new Date().toISOString(),
      notificationCount: 0
    };

    subscribers.push(subscription);
    console.log(`Client ${clientId} subscribed to resource ${uri}`);
    return true;
  }

  /**
   * Unsubscribe a client from a resource
   */
  unsubscribe(clientId: string, uri: string): boolean {
    const subscribers = this.subscriptions.get(uri);
    if (!subscribers) {
      return false; // Resource has no subscribers
    }

    const initialLength = subscribers.length;
    const filtered = subscribers.filter(sub => sub.clientId !== clientId);

    if (filtered.length === initialLength) {
      return false; // Client was not subscribed
    }

    if (filtered.length === 0) {
      this.subscriptions.delete(uri);
    } else {
      this.subscriptions.set(uri, filtered);
    }

    console.log(`Client ${clientId} unsubscribed from resource ${uri}`);
    return true;
  }

  /**
   * Get all subscriptions for a client
   */
  getClientSubscriptions(clientId: string): ResourceSubscription[] {
    const result: ResourceSubscription[] = [];

    for (const [uri, subscribers] of this.subscriptions.entries()) {
      const clientSub = subscribers.find(sub => sub.clientId === clientId);
      if (clientSub) {
        result.push(clientSub);
      }
    }

    return result;
  }

  /**
   * Get all subscribers for a resource
   */
  getResourceSubscribers(uri: string): string[] {
    const subscribers = this.subscriptions.get(uri);
    return subscribers ? subscribers.map(sub => sub.clientId) : [];
  }

  /**
   * Notify subscribers of resource changes
   */
  async notifyResourceUpdate(uri: string, notification: Omit<ResourceNotification, 'uri'>): Promise<void> {
    const subscribers = this.getResourceSubscribers(uri);
    if (subscribers.length === 0) {
      return; // No subscribers
    }

    const fullNotification: ResourceNotification = {
      uri,
      ...notification
    };

    // Queue notification for each subscriber
    for (const clientId of subscribers) {
      this.notificationQueue.push({
        ...fullNotification,
        // Add client-specific metadata if needed
      });

      // Update subscription stats
      this.updateSubscriptionStats(uri, clientId);
    }

    // Limit queue size
    if (this.notificationQueue.length > this.maxNotificationsPerClient * subscribers.length) {
      this.notificationQueue = this.notificationQueue.slice(-this.maxNotificationsPerClient);
    }

    console.log(`Notified ${subscribers.length} clients of resource update: ${uri}`);
  }

  /**
   * Get pending notifications for a client
   */
  getClientNotifications(clientId: string): ResourceNotification[] {
    return this.notificationQueue.filter(notification => {
      // In a real implementation, you'd track which notifications belong to which client
      // For now, return all notifications (this is a simplified implementation)
      return true;
    });
  }

  /**
   * Clear notifications for a client
   */
  clearClientNotifications(clientId: string): void {
    // In a real implementation, you'd filter out notifications for this client
    // For now, clear all (simplified)
    this.notificationQueue = [];
  }

  /**
   * Update subscription statistics
   */
  private updateSubscriptionStats(uri: string, clientId: string): void {
    const subscribers = this.subscriptions.get(uri);
    if (!subscribers) return;

    const subscription = subscribers.find(sub => sub.clientId === clientId);
    if (subscription) {
      subscription.notificationCount++;
      subscription.lastNotified = new Date().toISOString();
    }
  }

  /**
   * Check if a client is subscribed to a resource
   */
  isSubscribed(clientId: string, uri: string): boolean {
    const subscribers = this.subscriptions.get(uri);
    return subscribers ? subscribers.some(sub => sub.clientId === clientId) : false;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): { totalSubscriptions: number; totalSubscribers: number; resourcesWithSubscriptions: number } {
    let totalSubscriptions = 0;
    let totalSubscribers = new Set<string>();

    for (const subscribers of this.subscriptions.values()) {
      totalSubscriptions += subscribers.length;
      subscribers.forEach(sub => totalSubscribers.add(sub.clientId));
    }

    return {
      totalSubscriptions,
      totalSubscribers: totalSubscribers.size,
      resourcesWithSubscriptions: this.subscriptions.size
    };
  }

  /**
   * Clean up old subscriptions (for inactive clients)
   */
  cleanupInactiveSubscriptions(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    for (const [uri, subscribers] of this.subscriptions.entries()) {
      const activeSubscribers = subscribers.filter(sub => sub.lastNotified && sub.lastNotified > cutoffTime);

      if (activeSubscribers.length === 0) {
        this.subscriptions.delete(uri);
      } else {
        this.subscriptions.set(uri, activeSubscribers);
      }
    }

    console.log(`Cleaned up inactive subscriptions older than ${maxAgeHours} hours`);
  }
}

// Global resource subscription manager instance
let resourceManager: ResourceSubscriptionManager | null = null;

/**
 * Initialize resource subscription manager
 */
export function initializeResourceManager(): ResourceSubscriptionManager {
  resourceManager = new ResourceSubscriptionManager();
  console.log('Resource subscription manager initialized');
  return resourceManager;
}

/**
 * Get resource subscription manager instance
 */
export function getResourceManager(): ResourceSubscriptionManager {
  if (!resourceManager) {
    throw new Error('Resource manager not initialized. Call initializeResourceManager() first.');
  }
  return resourceManager;
}

/**
 * Validate resource URI against templates
 */
export function validateResourceUri(uri: string): boolean {
  // Check if URI matches any of our resource templates
  return RESOURCE_TEMPLATES.some(template => {
    // Simple pattern matching - in a real implementation, you'd use proper URI template matching
    const templateUri = template.uriTemplate.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${templateUri}$`);
    return regex.test(uri);
  });
}

/**
 * Generate example resource URIs
 */
export function getExampleResourceUris(): string[] {
  return [
    "legco://voting/Council Meeting/2024-01-01",
    "legco://bills/2024/2024-01-15",
    "legco://questions/oral/2024",
    "legco://hansard/questions/2024-01-01",
    "legco://health"
  ];
}