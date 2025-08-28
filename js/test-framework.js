// js/test-framework.js — Simple testing framework
(function(){
"use strict";

class TestFramework {
  constructor() {
    this.suites = {};
    this.results = {};
  }

  describe(suiteName, testFn) {
    if (!this.suites[suiteName]) {
      this.suites[suiteName] = [];
    }
    
    const suite = this.suites[suiteName];
    const originalIt = window.it;
    
    // Mock 'it' function for this suite
    window.it = (testName, testFn) => {
      suite.push({ name: testName, fn: testFn });
    };
    
    // Run the describe function to collect tests
    testFn();
    
    // Restore original 'it'
    window.it = originalIt;
  }

  async runSuite(suiteName) {
    if (!this.suites[suiteName]) {
      console.error('Suite not found:', suiteName);
      return;
    }

    const suite = this.suites[suiteName];
    const results = [];
    const startTime = performance.now();

    for (const test of suite) {
      const result = await this.runTest(test);
      results.push(result);
    }

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    this.results[suiteName] = {
      tests: results,
      duration: duration,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      total: results.length
    };

    this.displayResults();
  }

  async runTest(test) {
    const startTime = performance.now();
    
    try {
      await test.fn();
      const endTime = performance.now();
      return {
        name: test.name,
        status: 'pass',
        duration: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        name: test.name,
        status: 'fail',
        duration: Math.round(endTime - startTime),
        error: error.message
      };
    }
  }

  async runAll() {
    this.results = {};
    const startTime = performance.now();
    
    for (const suiteName of Object.keys(this.suites)) {
      await this.runSuite(suiteName);
    }
    
    const endTime = performance.now();
    this.totalDuration = Math.round(endTime - startTime);
    this.displaySummary();
  }

  displayResults() {
    const container = document.getElementById('test-results');
    container.innerHTML = '';

    for (const [suiteName, suiteResults] of Object.entries(this.results)) {
      const suiteDiv = document.createElement('div');
      suiteDiv.className = 'test-suite';
      
      const title = document.createElement('h3');
      title.textContent = `${suiteName} (${suiteResults.passed}/${suiteResults.total} passed)`;
      suiteDiv.appendChild(title);

      for (const test of suiteResults.tests) {
        const testDiv = document.createElement('div');
        testDiv.className = `test-case ${test.status}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = test.name;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = `${test.duration}ms`;
        
        testDiv.appendChild(nameSpan);
        testDiv.appendChild(timeSpan);
        
        if (test.error) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error';
          errorDiv.textContent = test.error;
          testDiv.appendChild(errorDiv);
        }
        
        suiteDiv.appendChild(testDiv);
      }
      
      container.appendChild(suiteDiv);
    }
  }

  displaySummary() {
    const summary = document.getElementById('summary');
    summary.style.display = 'grid';

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const suiteResults of Object.values(this.results)) {
      totalPassed += suiteResults.passed;
      totalFailed += suiteResults.failed;
      totalTests += suiteResults.total;
    }

    document.getElementById('passed-count').textContent = totalPassed;
    document.getElementById('failed-count').textContent = totalFailed;
    document.getElementById('total-count').textContent = totalTests;
    document.getElementById('time-count').textContent = `${this.totalDuration}ms`;
  }

  clearResults() {
    this.results = {};
    document.getElementById('test-results').innerHTML = '';
    document.getElementById('summary').style.display = 'none';
  }
}

// Assertion functions
const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but got ${actual}`);
    }
  },
  
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },
  
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected truthy value but got ${actual}`);
    }
  },
  
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected falsy value but got ${actual}`);
    }
  },
  
  toBeGreaterThan: (expected) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  
  toBeLessThan: (expected) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  
  toContain: (expected) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    }
  },
  
  toThrow: () => {
    try {
      actual();
      throw new Error('Expected function to throw but it did not');
    } catch (error) {
      // Expected behavior
    }
  }
});

// Global test framework instance
const TestRunner = new TestFramework();

// Global functions
window.describe = TestRunner.describe.bind(TestRunner);
window.it = () => {}; // Will be overridden in describe
window.expect = expect;
window.TestRunner = TestRunner;

})();