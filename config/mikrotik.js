module.exports = {
    // MikroTik API endpoints
    endpoints: {
        base: '/rest',
        hotspot: {
            bindings: '/ip/hotspot/ip-binding',
            active: '/ip/hotspot/active',
            users: '/ip/hotspot/user'
        },
        system: {
            reboot: '/system/reboot',
            resource: '/system/resource',
            identity: '/system/identity'
        }
    },
    
    // Default timeout in seconds
    timeout: 5,
    
    // Retry configuration
    retry: {
        attempts: 3,
        delay: 1000 // milliseconds
    }
};