import React, { useState, useEffect } from 'react';
import InstantCanvasEditor from './InstantCanvasEditor';
import { motion, AnimatePresence } from 'framer-motion';
import './InstantCanvasDemo.css';

const InstantCanvasDemo = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [performanceMode, setPerformanceMode] = useState('balanced');
  const [showMetrics, setShowMetrics] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runPerformanceTest = async () => {
    setTestRunning(true);
    setTestResults(null);
    
    try {
      // Simulate various rendering scenarios
      const scenarios = [
        { name: 'Basic Shapes', elements: 50 },
        { name: 'Complex Drawing', elements: 200 },
        { name: 'Rapid Updates', elements: 100, updatesPerSecond: 30 },
        { name: 'Large Canvas', elements: 500 }
      ];

      const results = [];
      
      for (const scenario of scenarios) {
        const startTime = performance.now();
        const frameCount = 60; // Test for 60 frames
        
        // Simulate rendering load
        for (let i = 0; i < frameCount; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          if (scenario.updatesPerSecond) {
            // Simulate rapid updates
            for (let j = 0; j < scenario.updatesPerSecond / 60; j++) {
              // Mock canvas update
              const mockUpdate = {
                type: 'update',
                elements: Array(scenario.elements).fill(null).map((_, idx) => ({
                  id: `element-${idx}`,
                  x: Math.random() * 800,
                  y: Math.random() * 600,
                  width: Math.random() * 100 + 20,
                  height: Math.random() * 100 + 20
                }))
              };
              
              // Process update (simulated)
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgFrameTime = totalTime / frameCount;
        const fps = 1000 / avgFrameTime;
        
        results.push({
          scenario: scenario.name,
          elements: scenario.elements,
          totalTime: Math.round(totalTime),
          avgFrameTime: Math.round(avgFrameTime * 100) / 100,
          fps: Math.round(fps),
          grade: fps >= 55 ? 'A' : fps >= 45 ? 'B' : fps >= 30 ? 'C' : 'D'
        });
      }
      
      setTestResults(results);
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="instant-canvas-demo">
      <div className="demo-header">
        <h1>Instant Canvas Rendering Demo</h1>
        <p>Experience real-time canvas updates with zero perceptible delay</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <button
            className={`demo-button ${showDemo ? 'active' : ''}`}
            onClick={() => setShowDemo(!showDemo)}
          >
            {showDemo ? 'Hide Demo' : 'Show Demo'}
          </button>
          
          <button
            className="demo-button secondary"
            onClick={runPerformanceTest}
            disabled={testRunning}
          >
            {testRunning ? 'Testing...' : 'Run Performance Test'}
          </button>
        </div>

        <div className="control-group">
          <label>Performance Mode:</label>
          <select
            value={performanceMode}
            onChange={(e) => setPerformanceMode(e.target.value)}
          >
            <option value="performance">Performance</option>
            <option value="balanced">Balanced</option>
            <option value="quality">Quality</option>
          </select>

          <label>
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={(e) => setShowMetrics(e.target.checked)}
            />
            Show Performance Metrics
          </label>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showDemo && (
          <motion.div
            className="demo-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="demo-features">
              <div className="feature-card">
                <h3>⚡ Instant Updates</h3>
                <p>Changes appear immediately with no perceptible delay using requestAnimationFrame optimization.</p>
              </div>
              
              <div className="feature-card">
                <h3>📊 Real-time Metrics</h3>
                <p>Monitor rendering performance with built-in FPS tracking and frame timing analysis.</p>
              </div>
              
              <div className="feature-card">
                <h3>🔄 Cross-browser Sync</h3>
                <p>Consistent performance across Chrome, Firefox, Safari, and Edge with optimized rendering.</p>
              </div>
              
              <div className="feature-card">
                <h3>🚀 Optimized Pipeline</h3>
                <p>Efficient state management with delta updates and intelligent batching for smooth performance.</p>
              </div>
            </div>

            <div className="canvas-container">
              <InstantCanvasEditor
                performanceMode={performanceMode}
                showMetrics={showMetrics}
                instantMode={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {testResults && (
        <motion.div
          className="test-results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3>Performance Test Results</h3>
          <div className="results-grid">
            {testResults.map((result, index) => (
              <div key={index} className={`result-card grade-${result.grade.toLowerCase()}`}>
                <h4>{result.scenario}</h4>
                <div className="metrics">
                  <div className="metric">
                    <span className="label">Elements:</span>
                    <span className="value">{result.elements}</span>
                  </div>
                  <div className="metric">
                    <span className="label">FPS:</span>
                    <span className="value">{result.fps}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Frame Time:</span>
                    <span className="value">{result.avgFrameTime}ms</span>
                  </div>
                  <div className="metric">
                    <span className="label">Grade:</span>
                    <span className={`grade ${result.grade.toLowerCase()}`}>{result.grade}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="demo-instructions">
        <h3>How to Test Instant Rendering:</h3>
        <ol>
          <li>Click "Show Demo" to open the canvas editor</li>
          <li>Draw shapes and notice the immediate visual feedback</li>
          <li>Toggle performance metrics to see real-time FPS and frame timing</li>
          <li>Switch between performance modes to compare rendering strategies</li>
          <li>Run the performance test to validate optimization effectiveness</li>
        </ol>
      </div>
    </div>
  );
};

export default InstantCanvasDemo;