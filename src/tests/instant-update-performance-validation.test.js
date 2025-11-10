import { renderHook, act, waitFor } from '@testing-library/react';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useInstantCanvasState } from '../hooks/useInstantCanvasState';
import { useCanvasPerformance } from '../hooks/useCanvasPerformance';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  INSTANT_UPDATE: 16.67, // 60fps = 16.67ms per frame
  MAX_ACCEPTABLE_DELAY: 50, // 50ms maximum delay
  MIN_ACCEPTABLE_FPS: 30, // Minimum 30fps
  RAPID_UPDATE_THRESHOLD: 100, // Handle 100 updates per second
  MEMORY_USAGE_LIMIT: 50 * 1024 * 1024 // 50MB memory limit
};

describe('Instant Update Performance Validation', () => {
  let performanceMarks = [];
  let originalPerformance;

  beforeEach(() => {
    // Setup performance monitoring
    performanceMarks = [];
    originalPerformance = global.performance;
    
    global.performance = {
      now: () => Date.now(),
      mark: (name) => {
        performanceMarks.push({ name, timestamp: Date.now() });
      },
      measure: (name, start, end) => {
        const startMark = performanceMarks.find(m => m.name === start);
        const endMark = performanceMarks.find(m => m.name === end);
        return endMark.timestamp - startMark.timestamp;
      },
      clearMarks: () => { performanceMarks = []; },
      clearMeasures: () => {}
    };
  });

  afterEach(() => {
    global.performance = originalPerformance;
  });

  describe('Instant Update Requirements', () => {
    it('should render updates within 16.67ms (60fps)', async () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      const startTime = performance.now();
      
      await act(async () => {
        result.current.queueUpdate({
          type: 'instant-test',
          data: { elements: [{ id: 'test', x: 100, y: 100 }] }
        });
        
        // Wait for frame completion
        await new Promise(resolve => requestAnimationFrame(resolve));
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INSTANT_UPDATE);
    });

    it('should handle rapid consecutive updates instantly', async () => {
      const { result } = renderHook(() => useCanvasRenderer());
      const updateTimes = [];
      
      // Simulate rapid user input (drawing)
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        await act(async () => {
          result.current.queueUpdate({
            type: 'rapid-update',
            data: { 
              elements: [{ 
                id: `element-${i}`, 
                x: i * 10, 
                y: i * 10,
                timestamp: startTime
              }] 
            }
          });
          
          await new Promise(resolve => requestAnimationFrame(resolve));
        });
        
        const endTime = performance.now();
        updateTimes.push(endTime - startTime);
      }
      
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      
      expect(avgUpdateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ACCEPTABLE_DELAY);
      expect(Math.max(...updateTimes)).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ACCEPTABLE_DELAY * 2);
    });

    it('should maintain 60fps during complex operations', async () => {
      const { result } = renderHook(() => useInstantCanvasState());
      const frameRates = [];
      
      // Create complex canvas state
      const complexElements = Array.from({ length: 100 }, (_, i) => ({
        id: `complex-${i}`,
        type: 'rectangle',
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: Math.random() * 100 + 20,
        height: Math.random() * 100 + 20,
        angle: Math.random() * 360,
        strokeColor: '#000000',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        opacity: 100,
        isDeleted: false
      }));
      
      // Measure performance over 60 frames
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();
        
        await act(async () => {
          // Update with complex elements
          result.current.updateCanvasContent(complexElements);
          
          // Add some random modifications
          const modifiedElements = complexElements.map(el => ({
            ...el,
            x: el.x + (Math.random() - 0.5) * 10,
            y: el.y + (Math.random() - 0.5) * 10
          }));
          
          result.current.updateCanvasContent(modifiedElements);
          
          await new Promise(resolve => requestAnimationFrame(resolve));
        });
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        const fps = 1000 / frameTime;
        frameRates.push(fps);
      }
      
      const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      const minFps = Math.min(...frameRates);
      
      expect(avgFps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_ACCEPTABLE_FPS);
      expect(minFps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.MIN_ACCEPTABLE_FPS - 10);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not exceed memory usage limits', () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Create large canvas update
      const largeUpdate = {
        type: 'memory-test',
        data: {
          elements: Array.from({ length: 1000 }, (_, i) => ({
            id: `memory-${i}`,
            x: i * 10,
            y: i * 10,
            width: 100,
            height: 100,
            data: new Array(1000).fill('test data') // Large data per element
          }))
        }
      };
      
      act(() => {
        result.current.queueUpdate(largeUpdate);
      });
      
      // Check memory usage (simulated)
      const metrics = result.current.getMetrics();
      expect(metrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
    });

    it('should clean up resources properly', () => {
      const { result, unmount } = renderHook(() => useCanvasRenderer());
      
      // Add some updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.queueUpdate({
            type: 'cleanup-test',
            data: { id: i }
          });
        }
      });
      
      // Unmount and check cleanup
      unmount();
      
      // Verify cleanup happened (no direct way to test, but should not throw)
      expect(() => {
        act(() => {
          result.current.queueUpdate({ type: 'after-cleanup', data: {} });
        });
      }).not.toThrow();
    });
  });

  describe('Synchronization Performance', () => {
    it('should sync updates within acceptable latency', async () => {
      const { result } = renderHook(() => useInstantCanvasState());
      
      const syncStart = performance.now();
      
      await act(async () => {
        // Simulate remote update
        result.current.applyExternalUpdate({
          elements: [
            { id: 'sync-1', x: 100, y: 100, type: 'rectangle' },
            { id: 'sync-2', x: 200, y: 200, type: 'circle' }
          ]
        });
        
        await new Promise(resolve => setTimeout(resolve, 1));
      });
      
      const syncEnd = performance.now();
      const syncLatency = syncEnd - syncStart;
      
      expect(syncLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ACCEPTABLE_DELAY);
    });

    it('should handle concurrent updates efficiently', async () => {
      const { result } = renderHook(() => useInstantCanvasState());
      
      const concurrentStart = performance.now();
      
      await act(async () => {
        // Simulate multiple concurrent updates
        const updates = Array.from({ length: 10 }, (_, i) => ({
          elements: [{ id: `concurrent-${i}`, x: i * 50, y: i * 50 }]
        }));
        
        // Apply all updates concurrently
        updates.forEach(update => {
          result.current.applyExternalUpdate(update);
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      const concurrentEnd = performance.now();
      const totalTime = concurrentEnd - concurrentStart;
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ACCEPTABLE_DELAY * 2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should accurately measure and report performance', () => {
      const { result } = renderHook(() => useCanvasPerformance());
      
      // Record various performance metrics
      act(() => {
        result.current.recordRender(16.67); // Perfect 60fps frame
        result.current.recordUpdate(8.33); // Fast update
        result.current.recordSync(4.17); // Quick sync
        result.current.recordMemoryUsage(1024 * 1024); // 1MB
      });
      
      const report = result.current.getReport();
      
      expect(report.rendering.avgFrameTime).toBe(16.67);
      expect(report.updates.avgUpdateTime).toBe(8.33);
      expect(report.sync.avgSyncTime).toBe(4.17);
      expect(report.memory.currentUsage).toBe(1024 * 1024);
    });

    it('should provide performance grades based on thresholds', () => {
      const { result } = renderHook(() => useCanvasPerformance());
      
      // Record excellent performance
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.recordRender(16.67); // Consistent 60fps
        }
      });
      
      const grade = result.current.getGrade();
      
      expect(grade).toBe('A');
      expect(result.current.getReport().rendering.grade).toBe('A');
    });

    it('should detect performance degradation', () => {
      const { result } = renderHook(() => useCanvasPerformance());
      
      // Record degrading performance
      act(() => {
        for (let i = 0; i < 30; i++) {
          result.current.recordRender(16.67); // Good performance
        }
        for (let i = 0; i < 30; i++) {
          result.current.recordRender(33.33); // Degraded performance
        }
      });
      
      const issues = result.current.detectIssues();
      
      expect(issues).toContain('Frame rate inconsistency detected');
      expect(result.current.getGrade()).toBeLessThan('A');
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle drawing with mouse/touch input', async () => {
      const { result } = renderHook(() => useInstantCanvasState());
      
      // Simulate drawing input
      const drawingPoints = Array.from({ length: 50 }, (_, i) => ({
        x: i * 10,
        y: Math.sin(i * 0.1) * 50 + 200,
        pressure: 0.8
      }));
      
      const drawingStart = performance.now();
      
      await act(async () => {
        for (const point of drawingPoints) {
          result.current.updateCanvasContent([{
            type: 'freedraw',
            x: point.x,
            y: point.y,
            pressure: point.pressure
          }]);
          
          // Simulate 60fps input rate
          await new Promise(resolve => setTimeout(resolve, 16.67));
        }
      });
      
      const drawingEnd = performance.now();
      const totalDrawingTime = drawingEnd - drawingStart;
      const avgPointTime = totalDrawingTime / drawingPoints.length;
      
      expect(avgPointTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INSTANT_UPDATE);
    });

    it('should maintain performance during collaborative editing', async () => {
      const { result: local } = renderHook(() => useInstantCanvasState());
      const { result: remote } = renderHook(() => useInstantCanvasState());
      
      // Simulate collaborative editing
      const collaborationStart = performance.now();
      
      await act(async () => {
        // Local user draws
        local.current.updateCanvasContent([{
          id: 'collab-1',
          type: 'rectangle',
          x: 100,
          y: 100
        }]);
        
        // Remote user updates
        remote.current.applyExternalUpdate({
          elements: [{
            id: 'collab-2',
            type: 'circle',
            x: 200,
            y: 200
          }]
        });
        
        // Sync between users
        local.current.applyExternalUpdate({
          elements: remote.current.content.elements
        });
        
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      const collaborationEnd = performance.now();
      const collaborationLatency = collaborationEnd - collaborationStart;
      
      expect(collaborationLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_ACCEPTABLE_DELAY);
    });
  });
});