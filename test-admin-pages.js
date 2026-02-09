#!/usr/bin/env node
/**
 * Comprehensive Admin Pages Test
 * Tests all admin routes and functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const ADMIN_PAGES = [
    '/admin/login',
    '/admin/dashboard',
    '/admin/users',
    '/admin/vouchers',
    '/admin/generate-vouchers',
    '/admin/analytics',
    '/admin/reports',
    '/admin/settings',
    '/admin/campaigns',
    '/admin/leads',
    '/admin/wallet',
    '/admin/locations',
    '/admin/routers',
    '/admin/revenue-share',
    '/admin/my-ads',
    '/admin/approve-content'
];

const API_ENDPOINTS = [
    '/admin/dashboard-stats',
    '/admin/analytics-data',
    '/admin/customers',
    '/admin/online-customers',
    '/admin/api/routers',
    '/admin/batches',
    '/admin/voucher-stats',
    '/admin/packages',
    '/admin/notifications',
    '/api/locations/all',
    '/api/locations/stats',
];

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function testURL(url, expectAuth = false) {
    return new Promise((resolve) => {
        const fullURL = `${BASE_URL}${url}`;

        http.get(fullURL, (res) => {
            const statusCode = res.statusCode;
            let passed = false;
            let message = '';

            if (expectAuth && (statusCode === 302 || statusCode === 401 || statusCode === 403)) {
                passed = true;
                message = `Auth required (${statusCode})`;
            } else if (!expectAuth && statusCode === 200) {
                passed = true;
                message = 'OK';
            } else if (statusCode === 200) {
                passed = true;
                message = 'OK';
            } else {
                message = `Status: ${statusCode}`;
            }

            if (passed) {
                passedTests++;
            } else {
                failedTests++;
            }

            testResults.push({
                url,
                passed,
                status: statusCode,
                message
            });

            resolve({ url, passed, status: statusCode });
        }).on('error', (err) => {
            failedTests++;
            testResults.push({
                url,
                passed: false,
                status: 'ERROR',
                message: err.message
            });
            resolve({ url, passed: false, error: err.message });
        });
    });
}

async function runTests() {
    console.log('🧪 HOTBANDO SYSTEM TEST - Inaanza...\n');
    console.log('=' .repeat(60));

    // Test 1: Admin Pages (should redirect or require auth)
    console.log('\n📄 Testing Admin Pages...');
    for (const page of ADMIN_PAGES) {
        const result = await testURL(page, page !== '/admin/login');
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${page.padEnd(40)} [${result.status}]`);
    }

    // Test 2: API Endpoints
    console.log('\n🔌 Testing API Endpoints...');
    for (const endpoint of API_ENDPOINTS) {
        const result = await testURL(endpoint, true);
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${endpoint.padEnd(40)} [${result.status}]`);
    }

    // Test 3: Public Routes
    console.log('\n🌐 Testing Public Routes...');
    const publicRoutes = ['/', '/hotspot', '/api/public/locations'];
    for (const route of publicRoutes) {
        const result = await testURL(route, false);
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${route.padEnd(40)} [${result.status}]`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Total Tests: ${passedTests + failedTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('\n⚠️  Failed Tests:');
        testResults.filter(t => !t.passed).forEach(t => {
            console.log(`   ❌ ${t.url} - ${t.message}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Testing complete!\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('❌ Test runner error:', err);
    process.exit(1);
});
