class MikroTikMockService {
    constructor() {
        this.users = new Map(); // Store mock users
    }
    
    async addUserToRouter(mac, routerID) {
        console.log(`[MOCK] Adding user ${mac} to router ${routerID}`);
        this.users.set(mac, {
            routerID,
            addedAt: new Date(),
            status: 'active'
        });
        
        // Simulate API delay
        return new Promise(resolve => {
            setTimeout(() => resolve(true), 300);
        });
    }
    
    async removeUserFromRouter(mac, routerID) {
        console.log(`[MOCK] Removing user ${mac} from router ${routerID}`);
        this.users.delete(mac);
        
        return new Promise(resolve => {
            setTimeout(() => resolve(true), 300);
        });
    }
    
    async checkUserExists(mac, routerID) {
        return this.users.has(mac);
    }
    
    async getHotspotUsers(routerID) {
        return Array.from(this.users.entries()).map(([mac, data]) => ({
            'mac-address': mac,
            'router-id': data.routerID,
            'added-at': data.addedAt
        }));
    }
}

module.exports = new MikroTikMockService();