/**
 * Performance monitoring and memory optimization utilities
 * Ensures AutoPrivacy CLI stays under 300MB RAM for large org exports
 */

export interface PerformanceMetrics {
  startTime: number;
  peakMemoryMB: number;
  currentMemoryMB: number;
  processedItems: number;
  estimatedTotalItems: number;
  stage: string;
}

export class PerformanceMonitor {
  private startTime: number;
  private peakMemoryMB: number = 0;
  private processedItems: number = 0;
  private estimatedTotal: number = 0;
  private currentStage: string = 'initialization';
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = Date.now();
    this.startMemoryMonitoring();
  }

  /**
   * Start continuous memory monitoring to track peak usage
   */
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      const currentMB = this.getCurrentMemoryMB();
      if (currentMB > this.peakMemoryMB) {
        this.peakMemoryMB = currentMB;
      }
      
      // Warn if approaching memory limit
      if (currentMB > 250) {
        console.warn(`⚠️  High memory usage: ${currentMB.toFixed(1)}MB (limit: 300MB)`);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get current memory usage in MB
   */
  getCurrentMemoryMB(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024;
  }

  /**
   * Update processing progress
   */
  updateProgress(stage: string, processed: number, estimated?: number): void {
    this.currentStage = stage;
    this.processedItems = processed;
    if (estimated) {
      this.estimatedTotal = estimated;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      startTime: this.startTime,
      peakMemoryMB: this.peakMemoryMB,
      currentMemoryMB: this.getCurrentMemoryMB(),
      processedItems: this.processedItems,
      estimatedTotalItems: this.estimatedTotal,
      stage: this.currentStage
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log(`🧹 Garbage collection triggered, memory: ${this.getCurrentMemoryMB().toFixed(1)}MB`);
    }
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const duration = (Date.now() - this.startTime) / 1000;
    const metrics = this.getMetrics();
    
    console.log('\n📊 Performance Summary:');
    console.log(`   Duration: ${duration.toFixed(1)}s`);
    console.log(`   Peak Memory: ${metrics.peakMemoryMB.toFixed(1)}MB`);
    console.log(`   Final Memory: ${metrics.currentMemoryMB.toFixed(1)}MB`);
    console.log(`   Items Processed: ${metrics.processedItems}`);
    console.log(`   Final Stage: ${metrics.stage}`);
    
    if (metrics.peakMemoryMB > 300) {
      console.warn(`⚠️  Memory limit exceeded! Peak: ${metrics.peakMemoryMB.toFixed(1)}MB > 300MB`);
    } else {
      console.log(`✅ Memory usage within limits (${metrics.peakMemoryMB.toFixed(1)}MB < 300MB)`);
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.logSummary();
  }
}

/**
 * Stream processing utility for large datasets
 * Processes data in chunks to maintain memory efficiency
 */
export class StreamProcessor<T> {
  private chunkSize: number;
  private processedCount: number = 0;

  constructor(chunkSize: number = 100) {
    this.chunkSize = chunkSize;
  }

  /**
   * Process large array in memory-efficient chunks
   */
  async processInChunks<R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.chunkSize) {
      const chunk = items.slice(i, i + this.chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      this.processedCount += chunk.length;
      
      if (onProgress) {
        onProgress(this.processedCount, items.length);
      }
      
      // Allow event loop to process other tasks
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return results;
  }

  /**
   * Process items one by one with memory cleanup
   */
  async processSequentially<R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const result = await processor(items[i], i);
      results.push(result);
      
      this.processedCount++;
      
      if (onProgress) {
        onProgress(this.processedCount, items.length);
      }
      
      // Periodic garbage collection for large datasets
      if (i % 1000 === 0 && global.gc) {
        global.gc();
      }
      
      // Allow event loop breathing room
      if (i % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return results;
  }
}

/**
 * Memory-efficient data buffer with automatic flushing
 */
export class DataBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  private flushCallback: (data: T[]) => Promise<void>;

  constructor(maxSize: number, flushCallback: (data: T[]) => Promise<void>) {
    this.maxSize = maxSize;
    this.flushCallback = flushCallback;
  }

  /**
   * Add item to buffer, auto-flush when full
   */
  async add(item: T): Promise<void> {
    this.buffer.push(item);
    
    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  /**
   * Manually flush buffer contents
   */
  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      const data = [...this.buffer];
      this.buffer = []; // Clear buffer immediately
      await this.flushCallback(data);
    }
  }

  /**
   * Get current buffer size
   */
  size(): number {
    return this.buffer.length;
  }
}
