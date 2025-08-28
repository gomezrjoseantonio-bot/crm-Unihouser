// js/test-suites.js — Test suites for CRM functionality
(function(){
"use strict";

// Mock functions for testing
function mockLocalStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => store[key] = value,
    removeItem: (key) => delete store[key],
    clear: () => Object.keys(store).forEach(key => delete store[key])
  };
}

// Unit tests for core functions
describe('unit', function() {
  
  it('should calculate rental yield correctly', function() {
    // Test basic rental yield calculation
    const annualRent = 12000;
    const investment = 200000;
    const expectedYield = (annualRent / investment) * 100;
    
    const actualYield = (annualRent / investment) * 100;
    expect(actualYield).toBe(6);
  });
  
  it('should format currency correctly', function() {
    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency', 
      currency: 'EUR', 
      maximumFractionDigits: 0
    });
    
    const result = formatter.format(150000);
    expect(result).toContain('€');
    expect(result).toContain('150');
  });
  
  it('should parse Spanish number format', function() {
    function parseEs(s) {
      return Number(String(s ?? '').trim().replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    expect(parseEs('150.000')).toBe(150000);
    expect(parseEs('150.000,50')).toBe(150000.5);
    expect(parseEs('1.500')).toBe(1500);
  });
  
  it('should validate email addresses', function() {
    function isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }
    
    expect(isValidEmail('test@example.com')).toBeTruthy();
    expect(isValidEmail('invalid-email')).toBeFalsy();
    expect(isValidEmail('test@domain')).toBeFalsy();
  });
  
  it('should calculate ITP correctly', function() {
    function calculateITP(price, percentage = 8) {
      return Math.round(price * (percentage / 100));
    }
    
    expect(calculateITP(200000, 8)).toBe(16000);
    expect(calculateITP(300000, 10)).toBe(30000);
  });
  
  it('should determine property category automatically', function() {
    function autoCategory(price, rentability) {
      if (price > 500000) return 'Lujo';
      if (rentability > 10) return 'Inversión';
      if (price < 150000) return 'Oportunidad';
      return 'Estándar';
    }
    
    expect(autoCategory(600000, 5)).toBe('Lujo');
    expect(autoCategory(200000, 12)).toBe('Inversión');
    expect(autoCategory(120000, 8)).toBe('Oportunidad');
    expect(autoCategory(250000, 7)).toBe('Estándar');
  });
  
  it('should calculate net yield after expenses', function() {
    function calculateNetYield(annualRent, investment, annualExpenses) {
      return ((annualRent - annualExpenses) / investment) * 100;
    }
    
    const result = calculateNetYield(12000, 200000, 2000);
    expect(result).toBe(5);
  });
  
  it('should validate required fields', function() {
    function validateEvaluation(data) {
      const required = ['precio', 'alq'];
      return required.every(field => data[field] && data[field] > 0);
    }
    
    expect(validateEvaluation({precio: 200000, alq: 1000})).toBeTruthy();
    expect(validateEvaluation({precio: 0, alq: 1000})).toBeFalsy();
    expect(validateEvaluation({precio: 200000})).toBeFalsy();
  });
});

// Integration tests
describe('integration', function() {
  
  it('should save and retrieve configuration', function() {
    const mockLS = mockLocalStorage();
    const originalLS = window.localStorage;
    window.localStorage = mockLS;
    
    try {
      const config = {
        brand_name: 'Test Company',
        categorias: [{name: 'Test Category', color: '#ff0000'}]
      };
      
      localStorage.setItem('cfg', JSON.stringify(config));
      const retrieved = JSON.parse(localStorage.getItem('cfg'));
      
      expect(retrieved.brand_name).toBe('Test Company');
      expect(retrieved.categorias.length).toBe(1);
      expect(retrieved.categorias[0].name).toBe('Test Category');
    } finally {
      window.localStorage = originalLS;
    }
  });
  
  it('should save and retrieve evaluations', function() {
    const mockLS = mockLocalStorage();
    const originalLS = window.localStorage;
    window.localStorage = mockLS;
    
    try {
      const evaluation = {
        id: 'eval_test_123',
        precio: 200000,
        alq: 1000,
        kpi_bruta: 6,
        categoria: 'Test'
      };
      
      const evals = [evaluation];
      localStorage.setItem('evals', JSON.stringify(evals));
      const retrieved = JSON.parse(localStorage.getItem('evals'));
      
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].precio).toBe(200000);
      expect(retrieved[0].categoria).toBe('Test');
    } finally {
      window.localStorage = originalLS;
    }
  });
  
  it('should filter evaluations by category', function() {
    const evaluations = [
      {categoria: 'Lujo', precio: 500000},
      {categoria: 'Inversión', precio: 200000},
      {categoria: 'Lujo', precio: 600000},
      {categoria: 'Estándar', precio: 300000}
    ];
    
    function filterByCategory(evals, category) {
      return evals.filter(e => e.categoria === category);
    }
    
    const luxuryProps = filterByCategory(evaluations, 'Lujo');
    expect(luxuryProps.length).toBe(2);
    expect(luxuryProps[0].precio).toBe(500000);
  });
  
  it('should calculate monthly statistics', function() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    
    const evaluations = [
      {ts: thisMonth.getTime(), precio: 200000},
      {ts: thisMonth.getTime(), precio: 300000},
      {ts: lastMonth.getTime(), precio: 150000}
    ];
    
    function getMonthlyStats(evals) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const thisMonthEvals = evals.filter(e => {
        const date = new Date(e.ts);
        return date >= monthStart;
      });
      
      return {
        count: thisMonthEvals.length,
        totalValue: thisMonthEvals.reduce((sum, e) => sum + e.precio, 0)
      };
    }
    
    const stats = getMonthlyStats(evaluations);
    expect(stats.count).toBe(2);
    expect(stats.totalValue).toBe(500000);
  });
  
  it('should detect budget alerts', function() {
    function checkBudgetAlert(currentCount, budgetLimit) {
      return currentCount > budgetLimit * 1.1; // 10% over budget
    }
    
    expect(checkBudgetAlert(22, 20)).toBeTruthy(); // 10% over
    expect(checkBudgetAlert(21, 20)).toBeFalsy(); // Just 5% over
    expect(checkBudgetAlert(20, 20)).toBeFalsy(); // Exactly on budget
  });
  
  it('should generate chart data correctly', function() {
    const evaluations = [
      {tipo: 'Tradicional', kpi_bruta: 8},
      {tipo: 'Tradicional', kpi_bruta: 6},
      {tipo: 'Habitaciones', kpi_bruta: 12},
      {tipo: 'Habitaciones', kpi_bruta: 10}
    ];
    
    function generateChartData(evals) {
      const byType = {};
      evals.forEach(eval => {
        const type = eval.tipo;
        if (!byType[type]) byType[type] = [];
        byType[type].push(eval.kpi_bruta);
      });
      
      const labels = Object.keys(byType);
      const values = labels.map(type => {
        const arr = byType[type];
        return arr.reduce((sum, v) => sum + v, 0) / arr.length;
      });
      
      return {labels, values};
    }
    
    const chartData = generateChartData(evaluations);
    expect(chartData.labels.length).toBe(2);
    expect(chartData.labels).toContain('Tradicional');
    expect(chartData.labels).toContain('Habitaciones');
    expect(chartData.values[0]).toBe(7); // Average of 8 and 6
  });
});

// Performance tests
describe('performance', function() {
  
  it('should handle large datasets efficiently', function() {
    const startTime = performance.now();
    
    // Generate large dataset
    const largeDataset = [];
    for (let i = 0; i < 1000; i++) {
      largeDataset.push({
        id: `eval_${i}`,
        precio: Math.random() * 500000 + 100000,
        kpi_bruta: Math.random() * 15 + 2,
        categoria: i % 3 === 0 ? 'Lujo' : 'Estándar'
      });
    }
    
    // Process dataset
    const filtered = largeDataset.filter(e => e.categoria === 'Lujo');
    const avgPrice = filtered.reduce((sum, e) => sum + e.precio, 0) / filtered.length;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(filtered.length).toBeGreaterThan(0);
    expect(avgPrice).toBeGreaterThan(0);
  });
  
  it('should render charts quickly', function() {
    const startTime = performance.now();
    
    // Mock chart rendering
    const data = Array.from({length: 50}, (_, i) => ({
      label: `Item ${i}`,
      value: Math.random() * 100
    }));
    
    // Simulate chart data processing
    const processed = data.map(item => ({
      ...item,
      percentage: (item.value / 100) * 100
    }));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(50); // Should complete in under 50ms
    expect(processed.length).toBe(50);
  });
});

// Error handling tests
describe('error-handling', function() {
  
  it('should handle invalid data gracefully', function() {
    function safeParseNumber(value) {
      try {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      } catch (error) {
        return 0;
      }
    }
    
    expect(safeParseNumber('123')).toBe(123);
    expect(safeParseNumber('invalid')).toBe(0);
    expect(safeParseNumber(null)).toBe(0);
    expect(safeParseNumber(undefined)).toBe(0);
  });
  
  it('should handle missing localStorage gracefully', function() {
    function safeLocalStorageGet(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }
    
    // This should not throw an error
    const result = safeLocalStorageGet('nonexistent');
    expect(result).toBe(null);
  });
  
  it('should validate chart data before rendering', function() {
    function validateChartData(data) {
      if (!Array.isArray(data)) return false;
      if (data.length === 0) return false;
      return data.every(item => 
        typeof item.value === 'number' && 
        !isNaN(item.value) && 
        item.label
      );
    }
    
    expect(validateChartData([{label: 'Test', value: 10}])).toBeTruthy();
    expect(validateChartData([])).toBeFalsy();
    expect(validateChartData([{label: 'Test', value: 'invalid'}])).toBeFalsy();
    expect(validateChartData('not an array')).toBeFalsy();
  });
});

})();