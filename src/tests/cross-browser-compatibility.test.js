import { renderHook, act, waitFor } from '@testing-library/react';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useInstantCanvasState } from '../hooks/useInstantCanvasState';
import { useCanvasPerformance } from '../hooks/useCanvasPerformance';

// Mock browser APIs
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
const mockPerformanceNow = jest.fn();

describe('Cross-Browser Canvas Rendering Tests', () => {
  let originalRAF;
  let originalCAF;
  let originalPerformance;

  beforeEach(() => {
    // Store original functions
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;
    originalPerformance = global.performance;

    // Mock browser APIs
    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.performance = {
      now: mockPerformanceNow,
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original functions
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    global.performance = originalPerformance;
  });

  describe('Browser Compatibility', () => {
    it('should handle missing requestAnimationFrame gracefully', () => {
      global.requestAnimationFrame = undefined;
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      expect(result.current).toBeDefined();
      expect(result.current.queueUpdate).toBeDefined();
      expect(result.current.forceRender).toBeDefined();
    });

    it('should handle missing performance API gracefully', () => {
      global.performance = undefined;
      
      const { result } = renderHook(() => useCanvasPerformance());
      
      expect(result.current).toBeDefined();
      expect(result.current.recordRender).toBeDefined();
      expect(result.current.getReport).toBeDefined();
    });

    it('should work with different requestAnimationFrame implementations', () => {
      // Simulate Chrome's implementation
      const chromeRAF = (callback) => setTimeout(callback, 16);
      global.requestAnimationFrame = chromeRAF;
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      act(() => {
        result.current.queueUpdate({ type: 'test', data: {} });
      });
      
      expect(result.current.getMetrics().totalUpdates).toBe(1);
    });

    it('should handle Safari timing differences', () => {
      // Simulate Safari's timing behavior
      mockPerformanceNow.mockReturnValue(1000);
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      act(() => {
        result.current.queueUpdate({ type: 'safari-test', data: {} });
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics.lastFrameTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle Firefox animation frame behavior', () => {
      // Simulate Firefox's RAF behavior
      let frameId = 0;
      global.requestAnimationFrame = (callback) => {
        const id = ++frameId;
        setTimeout(() => callback(performance.now()), 16);
        return id;
      };
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      act(() => {
        result.current.queueUpdate({ type: 'firefox-test', data: {} });
      });
      
      expect(result.current.getMetrics().renderedFrames).toBeGreaterThan(0);
    });
  });

  describe('Mobile Browser Compatibility', () => {
    it('should handle mobile Safari constraints', () => {
      // Simulate mobile Safari limitations
      global.requestAnimationFrame = (callback) => {
        // Mobile Safari might throttle RAF
        return setTimeout(callback, 33); // ~30fps
      };
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      act(() => {
        result.current.queueUpdate({ type: 'mobile-test', data: {} });
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics.renderedFrames).toBeGreaterThan(0);
    });

    it('should handle Android Chrome performance', () => {
      // Simulate Android Chrome behavior
      mockPerformanceNow.mockReturnValueOnce(500).mockReturnValueOnce(516);
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      act(() => {
        result.current.queueUpdate({ type: 'android-test', data: {} });
      });
      
      expect(result.current.getMetrics().avgFrameTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Consistency', () => {
    it('should maintain consistent FPS across different browsers', async () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Simulate 60 frames
      for (let i = 0; i < 60; i++) {
        mockPerformanceNow.mockReturnValue(i * 16.67); // ~60fps
        
        act(() => {
          result.current.queueUpdate({
            type: 'frame-test',
            data: { frame: i }
          });
        });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        });
      }
      
      const metrics = result.current.getMetrics();
      expect(metrics.renderedFrames).toBeGreaterThanOrEqual(55); // Allow for minor variations
      expect(metrics.avgFrameTime).toBeLessThan(20); // Should be under 20ms
    });

    it('should handle rapid updates consistently', async () => {
      const { result } = renderHook(() => useInstantCanvasState());
      
      // Simulate rapid updates like user drawing
      const rapidUpdates = Array.from({ length: 100 }, (_, i) => ({
        type: 'rapid-update',
        elements: [{ id: `element-${i}`, x: i * 10, y: i * 10 }]
      }));
      
      await act(async () => {
        for (const update of rapidUpdates) {
          result.current.updateCanvasContent(update.elements);
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      });
      
      expect(result.current.content.elements).toHaveLength(100);
    });
  });

  describe('Memory Management', () => {
    it('should handle memory constraints on mobile devices', () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Simulate memory pressure
      const largeUpdate = {
        type: 'memory-test',
        data: {
          elements: Array.from({ length: 1000 }, (_, i) => ({
            id: `element-${i}`,
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            width: Math.random() * 100,
            height: Math.random() * 100,
            data: new Array(100).fill('test') // Large data
          }))
        }
      };
      
      act(() => {
        result.current.queueUpdate(largeUpdate);
      });
      
      // Should not crash or cause memory issues
      expect(result.current.getMetrics().totalUpdates).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should recover from RAF failures', () => {
      global.requestAnimationFrame = () => {
        throw new Error('RAF not available');
      };
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      expect(() => {
        act(() => {
          result.current.queueUpdate({ type: 'error-test', data: {} });
        });
      }).not.toThrow();
    });

    it('should handle performance API errors', () => {
      global.performance.now = () => {
        throw new Error('Performance API error');
      };
      
      const { result } = renderHook(() => useCanvasPerformance());
      
      expect(() => {
        act(() => {
          result.current.recordRender(100);
        });
      }).not.toThrow();
    });
  });

  describe('Cross-Browser Feature Detection', () => {
    it('should detect and use optimal rendering path', () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Test feature detection
      const capabilities = result.current.getCapabilities();
      
      expect(capabilities).toHaveProperty('requestAnimationFrame');
      expect(capabilities).toHaveProperty('performance');
      expect(capabilities).toHaveProperty('highPrecision');
    });

    it('should adapt to browser capabilities', () => {
      // Simulate limited browser
      global.requestAnimationFrame = undefined;
      global.performance = { now: () => Date.now() };
      
      const { result } = renderHook(() => useCanvasRenderer());
      
      const capabilities = result.current.getCapabilities();
      expect(capabilities.requestAnimationFrame).toBe(false);
      expect(capabilities.performance).toBe(true);
      expect(capabilities.highPrecision).toBe(false);
    });
  });

  describe('Real-world Browser Scenarios', () => {
    it('should handle browser tab switching', async () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Simulate tab visibility changes
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
        configurable: true
      });
      
      act(() => {
        result.current.queueUpdate({ type: 'hidden-tab', data: {} });
      });
      
      // Should handle gracefully
      expect(result.current.getMetrics().totalUpdates).toBe(1);
      
      // Restore
      document.hidden = false;
    });

    it('should handle browser zoom changes', () => {
      const { result } = renderHook(() => useCanvasRenderer());
      
      // Simulate zoom change
      global.devicePixelRatio = 2; // High DPI
      
      act(() => {
        result.current.queueUpdate({ type: 'zoom-test', data: {} });
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics.renderedFrames).toBeGreaterThan(0);
    });
  });
});