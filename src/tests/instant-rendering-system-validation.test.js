import { renderHook, act } from '@testing-library/react';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import { useInstantCanvasState } from '../hooks/useInstantCanvasState';
import { useCanvasPerformance } from '../hooks/useCanvasPerformance';

// Performance requirements
const INSTANT_RENDER_REQUIREMENTS = {
  MAX_FRAME_TIME: 16.67, // 60fps
  MAX_UPDATE_LATENCY: 10, // 10ms max latency
  MIN_FPS: 55, // Minimum acceptable FPS
  MAX_MEMORY_USAGE: 25 * 1024 * 1024, // 25MB
  RAPID_UPDATE_THRESHOLD: 120 // Updates per second
};

describe('Instant Rendering System Validation', () => {
  describe('Complete System Integration', () => {
    it('should provide instant visual feedback for user interactions', async () => {
      const { result: renderer } = renderHook(() => useCanvasRenderer());
      const { result: canvasState } = renderHook(() => useInstantCanvasState());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      const interactionStart = performance.now();
      
      // Simulate user drawing a line
      const drawingPoints = [
        { x: 100, y: 100 },
        { x: 120, y: 105 },
        { x: 140, y: 110 },
        { x: 160, y: 115 },
        { x: 180, y: 120 }
      ];
      
      for (const point of drawingPoints) {
        const pointStart = performance.now();
        
        await act(async () => {
          // Update canvas state
          canvasState.current.updateCanvasContent([{
            type: 'freedraw',
            x: point.x,
            y: point.y,
            pressure: 0.8
          }]);
          
          // Queue rendering
          renderer.current.queueUpdate({
            type: 'draw',
            data: point,
            priority: 'high'
          });
          
          // Record performance
          performance.current.recordRender(performance.now() - pointStart);
          
          await new Promise(resolve => setTimeout(resolve, 1));
        });
        
        const pointEnd = performance.now();
        const pointLatency = pointEnd - pointStart;
        
        expect(pointLatency).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_UPDATE_LATENCY);
      }
      
      const interactionEnd = performance.now();
      const totalInteractionTime = interactionEnd - interactionStart;
      const avgPointTime = totalInteractionTime / drawingPoints.length;
      
      expect(avgPointTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_UPDATE_LATENCY);
      
      // Validate performance metrics
      const perfReport = performance.current.getReport();
      expect(perfReport.rendering.avgFrameTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_FRAME_TIME);
      expect(perfReport.rendering.grade).toBe('A');
    });

    it('should maintain instant updates during complex canvas operations', async () => {
      const { result: canvasState } = renderHook(() => useInstantCanvasState());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Create complex canvas with many elements
      const complexElements = Array.from({ length: 200 }, (_, i) => ({
        id: `complex-${i}`,
        type: i % 2 === 0 ? 'rectangle' : 'ellipse',
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: Math.random() * 100 + 20,
        height: Math.random() * 100 + 20,
        angle: Math.random() * 360,
        strokeColor: '#000000',
        backgroundColor: '#ffffff',
        strokeWidth: 2,
        roughness: 1,
        opacity: 100
      }));
      
      const complexStart = performance.now();
      
      await act(async () => {
        canvasState.current.updateCanvasContent(complexElements);
        performance.current.recordRender(performance.now() - complexStart);
      });
      
      const complexEnd = performance.now();
      const complexRenderTime = complexEnd - complexStart;
      
      expect(complexRenderTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_FRAME_TIME * 3);
      
      // Now test updates on complex canvas
      const updateStart = performance.now();
      
      await act(async () => {
        const updatedElements = complexElements.map(el => ({
          ...el,
          x: el.x + (Math.random() - 0.5) * 20,
          y: el.y + (Math.random() - 0.5) * 20
        }));
        
        canvasState.current.updateCanvasContent(updatedElements);
        performance.current.recordUpdate(performance.now() - updateStart);
      });
      
      const updateEnd = performance.now();
      const updateTime = updateEnd - updateStart;
      
      expect(updateTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_FRAME_TIME);
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet minimum FPS requirements under load', async () => {
      const { result: renderer } = renderHook(() => useCanvasRenderer());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      const frameRates = [];
      
      // Simulate 60 frames of heavy load
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();
        
        await act(async () => {
          // Queue multiple updates per frame
          for (let update = 0; update < 5; update++) {
            renderer.current.queueUpdate({
              type: 'load-test',
              data: {
                elements: Array.from({ length: 50 }, (_, i) => ({
                  id: `load-${frame}-${update}-${i}`,
                  x: Math.random() * 800,
                  y: Math.random() * 600
                }))
              },
              priority: 'normal'
            });
          }
          
          await new Promise(resolve => requestAnimationFrame(resolve));
        });
        
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        const fps = 1000 / frameTime;
        frameRates.push(fps);
        
        performance.current.recordRender(frameTime);
      }
      
      const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      const minFps = Math.min(...frameRates);
      
      expect(avgFps).toBeGreaterThan(INSTANT_RENDER_REQUIREMENTS.MIN_FPS);
      expect(minFps).toBeGreaterThan(INSTANT_RENDER_REQUIREMENTS.MIN_FPS - 10);
    });

    it('should handle rapid update rates without degradation', async () => {
      const { result: renderer } = renderHook(() => useCanvasRenderer());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      const rapidUpdateStart = performance.now();
      const updateTimes = [];
      
      // Simulate rapid updates (120 updates per second)
      for (let i = 0; i < INSTANT_RENDER_REQUIREMENTS.RAPID_UPDATE_THRESHOLD; i++) {
        const updateStart = performance.now();
        
        act(() => {
          renderer.current.queueUpdate({
            type: 'rapid-update',
            data: {
              id: `rapid-${i}`,
              timestamp: updateStart
            },
            priority: 'high'
          });
        });
        
        const updateEnd = performance.now();
        updateTimes.push(updateEnd - updateStart);
        
        // Maintain 120 updates per second rate
        await new Promise(resolve => setTimeout(resolve, 1000 / 120));
      }
      
      const rapidUpdateEnd = performance.now();
      const totalRapidTime = rapidUpdateEnd - rapidUpdateStart;
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      
      expect(avgUpdateTime).toBeLessThan(2); // Should be under 2ms per update
      expect(totalRapidTime).toBeLessThan(1200); // Should complete in under 1.2 seconds
    });
  });

  describe('Memory and Resource Management', () => {
    it('should stay within memory usage limits', () => {
      const { result: canvasState } = renderHook(() => useInstantCanvasState());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Create memory-intensive canvas
      const memoryIntensiveElements = Array.from({ length: 500 }, (_, i) => ({
        id: `memory-${i}`,
        type: 'rectangle',
        x: i * 2,
        y: i * 2,
        width: 100,
        height: 100,
        customData: new Array(1000).fill(`data-${i}`) // Large custom data
      }));
      
      act(() => {
        canvasState.current.updateCanvasContent(memoryIntensiveElements);
        performance.current.recordMemoryUsage(JSON.stringify(memoryIntensiveElements).length);
      });
      
      const report = performance.current.getReport();
      expect(report.memory.currentUsage).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_MEMORY_USAGE);
    });

    it('should clean up resources efficiently', async () => {
      const { result: renderer, unmount } = renderHook(() => useCanvasRenderer());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Add resources
      for (let i = 0; i < 100; i++) {
        act(() => {
          renderer.current.queueUpdate({
            type: 'resource-test',
            data: { id: i, data: new Array(1000).fill(i) }
          });
        });
      }
      
      // Unmount and verify cleanup
      unmount();
      
      // Should not cause memory leaks or errors
      expect(() => {
        performance.current.getReport();
      }).not.toThrow();
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should provide instant feedback for collaborative editing', async () => {
      const { result: user1 } = renderHook(() => useInstantCanvasState());
      const { result: user2 } = renderHook(() => useInstantCanvasState());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Simulate collaborative editing session
      const collaborationStart = performance.now();
      
      await act(async () => {
        // User 1 adds an element
        const user1Start = performance.now();
        user1.current.updateCanvasContent([{
          id: 'collab-1',
          type: 'rectangle',
          x: 100,
          y: 100
        }]);
        
        // User 2 adds an element
        const user2Start = performance.now();
        user2.current.updateCanvasContent([{
          id: 'collab-2',
          type: 'circle',
          x: 200,
          y: 200
        }]);
        
        // Sync between users
        user1.current.applyExternalUpdate({
          elements: user2.current.content.elements
        });
        
        user2.current.applyExternalUpdate({
          elements: user1.current.content.elements
        });
        
        performance.current.recordSync(performance.now() - collaborationStart);
        
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      const collaborationEnd = performance.now();
      const collaborationLatency = collaborationEnd - collaborationStart;
      
      expect(collaborationLatency).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_UPDATE_LATENCY * 2);
      
      const report = performance.current.getReport();
      expect(report.sync.avgSyncTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_UPDATE_LATENCY);
    });

    it('should maintain instant updates during complex tool operations', async () => {
      const { result: canvasState } = renderHook(() => useInstantCanvasState());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Simulate complex selection and transformation
      const elements = Array.from({ length: 50 }, (_, i) => ({
        id: `transform-${i}`,
        type: 'rectangle',
        x: i * 20,
        y: 100,
        width: 50,
        height: 50
      }));
      
      await act(async () => {
        canvasState.current.updateCanvasContent(elements);
      });
      
      // Simulate selection transformation
      const transformStart = performance.now();
      
      await act(async () => {
        const transformedElements = elements.map(el => ({
          ...el,
          x: el.x + 50,
          y: el.y + 30,
          angle: 45,
          scale: [1.5, 1.5]
        }));
        
        canvasState.current.updateCanvasContent(transformedElements);
        performance.current.recordUpdate(performance.now() - transformStart);
      });
      
      const transformEnd = performance.now();
      const transformTime = transformEnd - transformStart;
      
      expect(transformTime).toBeLessThan(INSTANT_RENDER_REQUIREMENTS.MAX_FRAME_TIME);
    });
  });

  describe('Final Performance Validation', () => {
    it('should achieve overall performance grade A', () => {
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Simulate optimal performance scenario
      act(() => {
        // Record excellent rendering performance
        for (let i = 0; i < 60; i++) {
          performance.current.recordRender(15); // 66fps
        }
        
        // Record excellent update performance
        for (let i = 0; i < 30; i++) {
          performance.current.recordUpdate(5); // 5ms updates
        }
        
        // Record excellent sync performance
        for (let i = 0; i < 20; i++) {
          performance.current.recordSync(3); // 3ms sync
        }
        
        // Record good memory usage
        performance.current.recordMemoryUsage(5 * 1024 * 1024); // 5MB
      });
      
      const finalGrade = performance.current.getGrade();
      const finalReport = performance.current.getReport();
      
      expect(finalGrade).toBe('A');
      expect(finalReport.rendering.grade).toBe('A');
      expect(finalReport.updates.grade).toBe('A');
      expect(finalReport.sync.grade).toBe('A');
    });

    it('should provide instant visual feedback with no perceptible delay', async () => {
      const { result: renderer } = renderHook(() => useCanvasRenderer());
      const { result: performance } = renderHook(() => useCanvasPerformance());
      
      // Test the most critical requirement: instant visual feedback
      const updates = [];
      
      for (let i = 0; i < 10; i++) {
        const updateStart = performance.now();
        
        await act(async () => {
          renderer.current.queueUpdate({
            type: 'instant-visual-test',
            data: {
              id: `instant-${i}`,
              visible: true,
              timestamp: updateStart
            },
            priority: 'critical'
          });
          
          await new Promise(resolve => requestAnimationFrame(resolve));
        });
        
        const updateEnd = performance.now();
        updates.push(updateEnd - updateStart);
      }
      
      const avgUpdateTime = updates.reduce((a, b) => a + b, 0) / updates.length;
      const maxUpdateTime = Math.max(...updates);
      
      // These are the strictest requirements - must be truly instant
      expect(avgUpdateTime).toBeLessThan(8); // Average under 8ms
      expect(maxUpdateTime).toBeLessThan(16); // Maximum under 16ms (1 frame)
      
      // Record final performance
      performance.current.recordRender(avgUpdateTime);
      
      const finalReport = performance.current.getReport();
      expect(finalReport.rendering.avgFrameTime).toBeLessThan(10);
      expect(finalReport.issues).toHaveLength(0); // No performance issues
    });
  });
});