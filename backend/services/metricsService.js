/**
 * Metrics Service - Tracks application performance and usage
 */

class MetricsService {
  constructor() {
    this.metrics = {
      // Query Statistics
      totalQueries: 0,
      successfulNavigations: 0,
      failedNavigations: 0,
      
      // LLM Performance
      llmParseSuccess: 0,
      llmParseFailed: 0,
      llmFallbackUsed: 0,
      llmAmbiguousQueries: 0,
      
      // Pathfinding Performance
      pathCalculationTimes: [],
      avgPathCalculationTime: 0,
      
      // Popular Routes
      popularRoutes: {}, // { "start->end": count }
      
      // Error Tracking
      errors: [],
      
      // Session Info
      startTime: new Date(),
      lastReset: new Date()
    };
  }

  // Record a navigation query
  recordNavigationQuery(startId, endId, success, duration, errorMessage = null) {
    this.metrics.totalQueries++;
    
    if (success) {
      this.metrics.successfulNavigations++;
      
      // Track popular routes
      const routeKey = `${startId}->${endId}`;
      this.metrics.popularRoutes[routeKey] = (this.metrics.popularRoutes[routeKey] || 0) + 1;
      
      // Track calculation time
      if (duration !== null && duration !== undefined) {
        this.metrics.pathCalculationTimes.push(duration);
        // Keep only last 100 times to prevent memory bloat
        if (this.metrics.pathCalculationTimes.length > 100) {
          this.metrics.pathCalculationTimes.shift();
        }
        // Recalculate average
        this.metrics.avgPathCalculationTime = 
          this.metrics.pathCalculationTimes.reduce((a, b) => a + b, 0) / 
          this.metrics.pathCalculationTimes.length;
      }
    } else {
      this.metrics.failedNavigations++;
      
      // Log error (keep last 50)
      this.metrics.errors.push({
        timestamp: new Date(),
        type: 'navigation',
        startId,
        endId,
        error: errorMessage
      });
      if (this.metrics.errors.length > 50) {
        this.metrics.errors.shift();
      }
    }
  }

  // Record LLM parsing attempt
  recordLLMParse(success, usedFallback = false, isAmbiguous = false, query = '', errorMessage = null) {
    if (success) {
      this.metrics.llmParseSuccess++;
    } else {
      this.metrics.llmParseFailed++;
      
      // Log error
      this.metrics.errors.push({
        timestamp: new Date(),
        type: 'llm_parse',
        query,
        error: errorMessage
      });
      if (this.metrics.errors.length > 50) {
        this.metrics.errors.shift();
      }
    }
    
    if (usedFallback) {
      this.metrics.llmFallbackUsed++;
    }
    
    if (isAmbiguous) {
      this.metrics.llmAmbiguousQueries++;
    }
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    // Calculate success rates
    const navigationSuccessRate = this.metrics.totalQueries > 0
      ? ((this.metrics.successfulNavigations / this.metrics.totalQueries) * 100).toFixed(2)
      : 0;
    
    const llmSuccessRate = (this.metrics.llmParseSuccess + this.metrics.llmParseFailed) > 0
      ? ((this.metrics.llmParseSuccess / (this.metrics.llmParseSuccess + this.metrics.llmParseFailed)) * 100).toFixed(2)
      : 0;
    
    // Get top 5 popular routes
    const topRoutes = Object.entries(this.metrics.popularRoutes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));
    
    return {
      uptime: {
        milliseconds: uptime,
        hours: uptimeHours,
        startedAt: this.metrics.startTime
      },
      navigation: {
        totalQueries: this.metrics.totalQueries,
        successful: this.metrics.successfulNavigations,
        failed: this.metrics.failedNavigations,
        successRate: `${navigationSuccessRate}%`
      },
      llm: {
        successful: this.metrics.llmParseSuccess,
        failed: this.metrics.llmParseFailed,
        fallbackUsed: this.metrics.llmFallbackUsed,
        ambiguousQueries: this.metrics.llmAmbiguousQueries,
        successRate: `${llmSuccessRate}%`
      },
      performance: {
        avgPathCalculationTime: this.metrics.avgPathCalculationTime >= 1000 
          ? `${(this.metrics.avgPathCalculationTime / 1000).toFixed(3)}s`
          : `${this.metrics.avgPathCalculationTime.toFixed(0)}ms`,
        avgPathCalculationTimeRaw: this.metrics.avgPathCalculationTime,
        recentCalculations: this.metrics.pathCalculationTimes.length
      },
      topRoutes,
      recentErrors: this.metrics.errors.slice(-10).reverse() // Last 10 errors, newest first
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      totalQueries: 0,
      successfulNavigations: 0,
      failedNavigations: 0,
      llmParseSuccess: 0,
      llmParseFailed: 0,
      llmFallbackUsed: 0,
      llmAmbiguousQueries: 0,
      pathCalculationTimes: [],
      avgPathCalculationTime: 0,
      popularRoutes: {},
      errors: [],
      startTime: new Date(),
      lastReset: new Date()
    };
  }

  // Export metrics as JSON (for logging/backup)
  exportMetrics() {
    return {
      ...this.getMetrics(),
      rawData: {
        pathCalculationTimes: this.metrics.pathCalculationTimes,
        popularRoutes: this.metrics.popularRoutes,
        allErrors: this.metrics.errors
      }
    };
  }
}

// Singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;
