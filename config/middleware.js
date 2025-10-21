const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./database');

module.exports = function(app) {
    // Session store
    const sessionStore = new MySQLStore({
        expiration: 86400000,
        createDatabaseTable: true,
        schema: {
            tableName: 'sessions',
            columnNames: {
                session_id: 'session_id',
                expires: 'expires',
                data: 'data'
            }
        }
    }, db);

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('public'));

    // Session middleware
    app.use(session({
        key: 'hotbando_session',
        secret: process.env.SESSION_SECRET || 'hotbando-secret-key-2025',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            secure: false
        }
    }));

    // Client IP middleware
    app.use((req, res, next) => {
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        req.clientIP = clientIP;
        next();
    });

    // Simulation middleware - Generate device data if not from real device
    app.use('/hotspot', (req, res, next) => {
        if (!req.session.mac) {
            req.session.mac = generateRandomMAC();
            req.session.location = getRandomLocation();
            req.session.routerID = `router-sim-001`;
            req.session.ssidshow = 'HotBando WiFi';
            
            console.log('🎮 Simulation Mode - Generated Device:', {
                mac: req.session.mac,
                location: req.session.location,
                router: req.session.routerID,
                ip: req.clientIP
            });
        }
        next();
    });

    // Make user data available to all views
    app.use((req, res, next) => {
        res.locals.user = req.session.hotbando_user;
        res.locals.mac = req.session.mac;
        res.locals.location = req.session.location;
        next();
    });
};

// Utility functions for simulation
function generateRandomMAC() {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
        mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
        if (i < 5) mac += ':';
    }
    return mac;
}

function getRandomLocation() {
    const locations = [
        'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 
        'Morogoro', 'Tanga', 'Kahama', 'Moshi', 'Zanzibar'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
}