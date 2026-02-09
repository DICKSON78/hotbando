#!/usr/bin/env node

/**
 * Comprehensive System Testing Script
 * Tests all major functionality of HotBando platform
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function testResult(name, passed, details = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        log(`✅ ${name}`, 'green');
    } else {
        failedTests++;
        log(`❌ ${name}`, 'red');
        if (details) log(`   ${details}`, 'yellow');
    }
}

async function testHealthCheck() {
    log('\n📊 Testing System Health...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/hotspot/health-check`);
        testResult('Health Check Endpoint', response.data.success === true);
        testResult('System Status Available', response.data.system !== undefined);
        return true;
    } catch (error) {
        testResult('Health Check Endpoint', false, error.message);
        return false;
    }
}

async function testPublicEndpoints() {
    log('\n🌐 Testing Public Endpoints...', 'blue');
    
    const endpoints = [
        { url: '/hotspot', name: 'Hotspot Portal' },
        { url: '/admin/login', name: 'Admin Login Page' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint.url}`);
            testResult(endpoint.name, response.status === 200);
        } catch (error) {
            testResult(endpoint.name, false, error.message);
        }
    }
}

async function testSecurityHeaders() {
    log('\n🔒 Testing Security Headers...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/hotspot`);
        const headers = response.headers;
        
        testResult('X-Content-Type-Options Header', headers['x-content-type-options'] === 'nosniff');
        testResult('X-Frame-Options Header', headers['x-frame-options'] === 'DENY');
        testResult('X-XSS-Protection Header', headers['x-xss-protection'] !== undefined);
        testResult('Content-Security-Policy Header', headers['content-security-policy'] !== undefined);
    } catch (error) {
        testResult('Security Headers', false, error.message);
    }
}

async function testRateLimiting() {
    log('\n⏱️  Testing Rate Limiting...', 'blue');
    
    try {
        // Make multiple rapid requests
        const requests = [];
        for (let i = 0; i < 5; i++) {
            requests.push(axios.get(`${BASE_URL}/api/campaigns/active`).catch(e => e.response));
        }
        
        const responses = await Promise.all(requests);
        const hasRateLimit = responses.some(r => r && r.headers && r.headers['x-ratelimit-limit']);
        
        testResult('Rate Limit Headers Present', hasRateLimit);
    } catch (error) {
        testResult('Rate Limiting Test', false, error.message);
    }
}

async function testAPIEndpoints() {
    log('\n🔌 Testing API Endpoints (Unauthenticated)...', 'blue');
    
    const endpoints = [
        { url: '/api/campaigns/active', name: 'Get Active Campaigns', expectAuth: false },
        { url: '/admin/api/dashboard-stats', name: 'Dashboard Stats', expectAuth: true },
        { url: '/api/campaigns/my-campaigns', name: 'My Campaigns', expectAuth: true }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint.url}`);
            
            if (endpoint.expectAuth) {
                // Should fail without auth
                testResult(`${endpoint.name} (Auth Required)`, response.data.success === false);
            } else {
                testResult(endpoint.name, response.status === 200);
            }
        } catch (error) {
            if (endpoint.expectAuth && error.response && error.response.status === 401) {
                testResult(`${endpoint.name} (Auth Required)`, true);
            } else {
                testResult(endpoint.name, false, error.message);
            }
        }
    }
}

async function testAJAXUtilities() {
    log('\n⚡ Testing AJAX Utilities...', 'blue');
    
    try {
        const response = await axios.get(`${BASE_URL}/js/ajax-utils.js`);
        const content = response.data;
        
        testResult('AJAX Utils File Exists', response.status === 200);
        testResult('AjaxUtils Object Defined', content.includes('const AjaxUtils'));
        testResult('showSuccess Method', content.includes('showSuccess'));
        testResult('showError Method', content.includes('showError'));
        testResult('loadTable Method', content.includes('loadTable'));
    } catch (error) {
        testResult('AJAX Utilities', false, error.message);
    }
}

async function testStaticAssets() {
    log('\n📦 Testing Static Assets...', 'blue');
    
    const assets = [
        { url: '/js/ajax-utils.js', name: 'AJAX Utils' },
        { url: '/js/campaigns.js', name: 'Campaigns JS' },
        { url: '/js/notifications.js', name: 'Notifications JS' }
    ];
    
    for (const asset of assets) {
        try {
            const response = await axios.get(`${BASE_URL}${asset.url}`);
            testResult(asset.name, response.status === 200);
        } catch (error) {
            testResult(asset.name, false, 'File not found');
        }
    }
}

async function testErrorHandling() {
    log('\n🚨 Testing Error Handling...', 'blue');
    
    try {
        // Test 404
        const response404 = await axios.get(`${BASE_URL}/nonexistent-page`).catch(e => e.response);
        testResult('404 Error Handling', response404.status === 404);
        
        // Test invalid API endpoint
        const responseAPI = await axios.get(`${BASE_URL}/api/invalid-endpoint`).catch(e => e.response);
        testResult('Invalid API Endpoint', responseAPI.status === 404);
    } catch (error) {
        testResult('Error Handling', false, error.message);
    }
}

async function testPerformance() {
    log('\n⚡ Testing Performance...', 'blue');
    
    try {
        const start = Date.now();
        await axios.get(`${BASE_URL}/hotspot`);
        const duration = Date.now() - start;
        
        testResult('Page Load < 1000ms', duration < 1000, `Loaded in ${duration}ms`);
        
        // Test concurrent requests
        const concurrentStart = Date.now();
        await Promise.all([
            axios.get(`${BASE_URL}/hotspot`),
            axios.get(`${BASE_URL}/admin/login`),
            axios.get(`${BASE_URL}/hotspot/health-check`)
        ]);
        const concurrentDuration = Date.now() - concurrentStart;
        
        testResult('Concurrent Requests < 2000ms', concurrentDuration < 2000, `Completed in ${concurrentDuration}ms`);
    } catch (error) {
        testResult('Performance Test', false, error.message);
    }
}

async function runAllTests() {
    log('\n🧪 HotBando Platform - Comprehensive Testing', 'blue');
    log('='.repeat(50), 'blue');
    
    const systemHealthy = await testHealthCheck();
    
    if (!systemHealthy) {
        log('\n⚠️  System health check failed. Skipping remaining tests.', 'yellow');
        return;
    }
    
    await testPublicEndpoints();
    await testSecurityHeaders();
    await testRateLimiting();
    await testAPIEndpoints();
    await testAJAXUtilities();
    await testStaticAssets();
    await testErrorHandling();
    await testPerformance();
    
    // Summary
    log('\n' + '='.repeat(50), 'blue');
    log('\n📊 Test Summary:', 'blue');
    log(`Total Tests: ${totalTests}`, 'blue');
    log(`Passed: ${passedTests}`, 'green');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, passedTests === totalTests ? 'green' : 'yellow');
    
    if (passedTests === totalTests) {
        log('\n✅ All tests passed! System is production ready.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please review and fix issues.', 'yellow');
    }
    
    log('\n');
}

// Run tests
runAllTests().catch(error => {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
});
