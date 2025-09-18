// Progress Notifications for MCP 2025-06-18
// Implements progress reporting for long-running tool executions

import { z } from "zod";

// Progress notification types
export interface ProgressNotification {
  method: 'notifications/progress';
  params: {
    progressToken: string;
    progress: number; // 0.0 to 1.0
    total?: number;
    message?: string;
    annotations?: {
      audience?: string[];
      priority?: number;
    };
  };
}

export interface ProgressTracker {
  token: string;
  startTime: number;
  lastUpdate: number;
  currentProgress: number;
  total?: number;
  message?: string;
  completed: boolean;
  clientId?: string;
}

// Progress notification schemas
export const createProgressTokenSchema = {
  operation: z.string().describe("Name of the operation for progress tracking"),
  estimatedDuration: z.number().optional().describe("Estimated duration in milliseconds")
};

// Progress tracking manager
export class ProgressNotificationManager {
  private activeProgress: Map<string, ProgressTracker> = new Map();
  private maxConcurrentProgress = 50;
  private cleanupInterval: number | null = null;

  constructor() {
    // Auto-cleanup old progress trackers every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldProgress();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new progress tracker
   */
  createProgressTracker(
    operation: string,
    clientId?: string,
    estimatedTotal?: number
  ): string {
    // Generate unique progress token
    const token = `${operation}_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    const tracker: ProgressTracker = {
      token,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      currentProgress: 0,
      total: estimatedTotal,
      message: `Starting ${operation}`,
      completed: false,
      clientId
    };

    // Limit concurrent progress trackers
    if (this.activeProgress.size >= this.maxConcurrentProgress) {
      this.cleanupOldProgress();
    }

    if (this.activeProgress.size >= this.maxConcurrentProgress) {
      // Remove oldest completed tracker
      const oldestCompleted = [...this.activeProgress.entries()]
        .filter(([, tracker]) => tracker.completed)
        .sort(([, a], [, b]) => a.lastUpdate - b.lastUpdate)[0];

      if (oldestCompleted) {
        this.activeProgress.delete(oldestCompleted[0]);
      }
    }

    this.activeProgress.set(token, tracker);
    console.log(`Created progress tracker: ${token} for operation: ${operation}`);

    return token;
  }

  /**
   * Update progress for a tracker
   */
  updateProgress(
    token: string,
    progress: number,
    message?: string,
    additionalData?: any
  ): ProgressNotification | null {
    const tracker = this.activeProgress.get(token);
    if (!tracker || tracker.completed) {
      return null;
    }

    // Validate progress value
    const clampedProgress = Math.max(0, Math.min(1, progress));
    tracker.currentProgress = clampedProgress;
    tracker.lastUpdate = Date.now();

    if (message) {
      tracker.message = message;
    }

    // Mark as completed if progress is 1.0
    if (clampedProgress >= 1.0) {
      tracker.completed = true;
    }

    const notification: ProgressNotification = {
      method: 'notifications/progress',
      params: {
        progressToken: token,
        progress: clampedProgress,
        total: tracker.total,
        message: tracker.message,
        annotations: {
          audience: ['user', 'assistant'],
          priority: this.getProgressPriority(clampedProgress)
        }
      }
    };

    console.log(`Progress update: ${token} - ${Math.round(clampedProgress * 100)}% - ${message || 'In progress'}`);

    return notification;
  }

  /**
   * Mark progress as completed
   */
  completeProgress(token: string, finalMessage?: string): ProgressNotification | null {
    const tracker = this.activeProgress.get(token);
    if (!tracker || tracker.completed) {
      return null;
    }

    tracker.completed = true;
    tracker.currentProgress = 1.0;
    tracker.lastUpdate = Date.now();

    if (finalMessage) {
      tracker.message = finalMessage;
    }

    const notification: ProgressNotification = {
      method: 'notifications/progress',
      params: {
        progressToken: token,
        progress: 1.0,
        total: tracker.total,
        message: tracker.message || 'Completed',
        annotations: {
          audience: ['user', 'assistant'],
          priority: 0.9 // High priority for completion
        }
      }
    };

    console.log(`Progress completed: ${token} - ${finalMessage || 'Completed'}`);

    return notification;
  }

  /**
   * Get current progress status
   */
  getProgressStatus(token: string): ProgressTracker | null {
    return this.activeProgress.get(token) || null;
  }

  /**
   * Get all active progress trackers for a client
   */
  getClientProgress(clientId: string): ProgressTracker[] {
    return [...this.activeProgress.values()]
      .filter(tracker => tracker.clientId === clientId && !tracker.completed);
  }

  /**
   * Cancel progress tracking
   */
  cancelProgress(token: string): boolean {
    const tracker = this.activeProgress.get(token);
    if (!tracker) {
      return false;
    }

    tracker.completed = true;
    tracker.message = 'Cancelled';
    console.log(`Progress cancelled: ${token}`);
    return true;
  }

  /**
   * Clean up old completed progress trackers
   */
  cleanupOldProgress(maxAgeMinutes: number = 30): void {
    const cutoffTime = Date.now() - maxAgeMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [token, tracker] of this.activeProgress.entries()) {
      if (tracker.completed && tracker.lastUpdate < cutoffTime) {
        this.activeProgress.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old progress trackers`);
    }
  }

  /**
   * Get progress statistics
   */
  getProgressStats(): {
    active: number;
    completed: number;
    total: number;
    averageCompletionTime: number;
  } {
    const trackers = [...this.activeProgress.values()];
    const active = trackers.filter(t => !t.completed).length;
    const completed = trackers.filter(t => t.completed).length;

    // Calculate average completion time for completed trackers
    const completedTrackers = trackers.filter(t => t.completed && t.startTime && t.lastUpdate);
    const averageCompletionTime = completedTrackers.length > 0
      ? completedTrackers.reduce((sum, t) => sum + (t.lastUpdate - t.startTime), 0) / completedTrackers.length
      : 0;

    return {
      active,
      completed,
      total: trackers.length,
      averageCompletionTime: Math.round(averageCompletionTime)
    };
  }

  /**
   * Determine progress notification priority
   */
  private getProgressPriority(progress: number): number {
    if (progress >= 1.0) return 0.9; // Completion is high priority
    if (progress >= 0.8) return 0.7; // Near completion
    if (progress >= 0.5) return 0.5; // Halfway
    if (progress >= 0.2) return 0.3; // Started
    return 0.1; // Just beginning
  }

  /**
   * Destroy the manager and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.activeProgress.clear();
  }
}

// Global progress notification manager instance
let progressManager: ProgressNotificationManager | null = null;

/**
 * Initialize progress notification manager
 */
export function initializeProgressManager(): ProgressNotificationManager {
  progressManager = new ProgressNotificationManager();
  console.log('Progress notification manager initialized');
  return progressManager;
}

/**
 * Get progress notification manager instance
 */
export function getProgressManager(): ProgressNotificationManager {
  if (!progressManager) {
    throw new Error('Progress manager not initialized. Call initializeProgressManager() first.');
  }
  return progressManager;
}

/**
 * Helper function to create progress-aware async operation
 */
export async function withProgressTracking<T>(
  operation: string,
  operationFn: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
  clientId?: string
): Promise<T> {
  const manager = getProgressManager();
  const token = manager.createProgressTracker(operation, clientId);

  try {
    const updateProgress = (progress: number, message?: string) => {
      manager.updateProgress(token, progress, message);
    };

    const result = await operationFn(updateProgress);

    // Mark as completed
    manager.completeProgress(token, 'Operation completed successfully');

    return result;
  } catch (error) {
    // Mark as completed with error
    manager.completeProgress(token, `Operation failed: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Check if an operation should report progress
 */
export function shouldReportProgress(operation: string, estimatedDuration?: number): boolean {
  // Report progress for operations expected to take more than 2 seconds
  if (estimatedDuration && estimatedDuration > 2000) {
    return true;
  }

  // Report progress for known long-running operations
  const longRunningOperations = [
    'search_voting_results',
    'search_bills',
    'search_questions',
    'search_hansard'
  ];

  return longRunningOperations.includes(operation);
}