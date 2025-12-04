/**
 * Base Model Class
 * Provides common database operations for all models
 */

const db = require('../config/database');

class BaseModel {
    constructor(tableName) {
        this.table = tableName;
        this.db = db;
    }

    /**
     * Find all records with optional conditions
     */
    async findAll(conditions = {}, orderBy = 'id DESC', limit = null) {
        try {
            let query = `SELECT * FROM ${this.table}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClauses = Object.keys(conditions).map(key => `${key} = ?`);
                query += ` WHERE ${whereClauses.join(' AND ')}`;
                params.push(...Object.values(conditions));
            }

            if (orderBy) {
                query += ` ORDER BY ${orderBy}`;
            }

            if (limit) {
                query += ` LIMIT ${limit}`;
            }

            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            console.error(`Error in ${this.table}.findAll:`, error);
            throw error;
        }
    }

    /**
     * Find one record by ID
     */
    async findById(id) {
        try {
            const [rows] = await this.db.query(
                `SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error(`Error in ${this.table}.findById:`, error);
            throw error;
        }
    }

    /**
     * Find one record by conditions
     */
    async findOne(conditions = {}) {
        try {
            let query = `SELECT * FROM ${this.table}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClauses = Object.keys(conditions).map(key => `${key} = ?`);
                query += ` WHERE ${whereClauses.join(' AND ')}`;
                params.push(...Object.values(conditions));
            }

            query += ' LIMIT 1';

            const [rows] = await this.db.query(query, params);
            return rows[0] || null;
        } catch (error) {
            console.error(`Error in ${this.table}.findOne:`, error);
            throw error;
        }
    }

    /**
     * Create a new record
     */
    async create(data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');

            const query = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
            const [result] = await this.db.query(query, values);

            return {
                id: result.insertId,
                ...data
            };
        } catch (error) {
            console.error(`Error in ${this.table}.create:`, error);
            throw error;
        }
    }

    /**
     * Update a record by ID
     */
    async update(id, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClauses = keys.map(key => `${key} = ?`).join(', ');

            const query = `UPDATE ${this.table} SET ${setClauses} WHERE id = ?`;
            const [result] = await this.db.query(query, [...values, id]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error in ${this.table}.update:`, error);
            throw error;
        }
    }

    /**
     * Update records by conditions
     */
    async updateWhere(conditions, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClauses = keys.map(key => `${key} = ?`).join(', ');

            const whereKeys = Object.keys(conditions);
            const whereValues = Object.values(conditions);
            const whereClauses = whereKeys.map(key => `${key} = ?`).join(' AND ');

            const query = `UPDATE ${this.table} SET ${setClauses} WHERE ${whereClauses}`;
            const [result] = await this.db.query(query, [...values, ...whereValues]);

            return result.affectedRows;
        } catch (error) {
            console.error(`Error in ${this.table}.updateWhere:`, error);
            throw error;
        }
    }

    /**
     * Delete a record by ID
     */
    async delete(id) {
        try {
            const [result] = await this.db.query(
                `DELETE FROM ${this.table} WHERE id = ?`,
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error(`Error in ${this.table}.delete:`, error);
            throw error;
        }
    }

    /**
     * Delete records by conditions
     */
    async deleteWhere(conditions) {
        try {
            const keys = Object.keys(conditions);
            const values = Object.values(conditions);
            const whereClauses = keys.map(key => `${key} = ?`).join(' AND ');

            const query = `DELETE FROM ${this.table} WHERE ${whereClauses}`;
            const [result] = await this.db.query(query, values);

            return result.affectedRows;
        } catch (error) {
            console.error(`Error in ${this.table}.deleteWhere:`, error);
            throw error;
        }
    }

    /**
     * Count records with optional conditions
     */
    async count(conditions = {}) {
        try {
            let query = `SELECT COUNT(*) as count FROM ${this.table}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClauses = Object.keys(conditions).map(key => `${key} = ?`);
                query += ` WHERE ${whereClauses.join(' AND ')}`;
                params.push(...Object.values(conditions));
            }

            const [rows] = await this.db.query(query, params);
            return rows[0].count;
        } catch (error) {
            console.error(`Error in ${this.table}.count:`, error);
            throw error;
        }
    }

    /**
     * Execute custom query
     */
    async query(sql, params = []) {
        try {
            const [rows] = await this.db.query(sql, params);
            return rows;
        } catch (error) {
            console.error(`Error in custom query:`, error);
            throw error;
        }
    }

    /**
     * Begin transaction
     */
    async beginTransaction() {
        const connection = await this.db.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Paginate results
     */
    async paginate(page = 1, perPage = 20, conditions = {}, orderBy = 'id DESC') {
        try {
            const offset = (page - 1) * perPage;

            // Get total count
            const total = await this.count(conditions);

            // Get paginated data
            let query = `SELECT * FROM ${this.table}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClauses = Object.keys(conditions).map(key => `${key} = ?`);
                query += ` WHERE ${whereClauses.join(' AND ')}`;
                params.push(...Object.values(conditions));
            }

            if (orderBy) {
                query += ` ORDER BY ${orderBy}`;
            }

            query += ` LIMIT ${perPage} OFFSET ${offset}`;

            const [rows] = await this.db.query(query, params);

            return {
                data: rows,
                pagination: {
                    page,
                    perPage,
                    total,
                    totalPages: Math.ceil(total / perPage),
                    hasNext: page < Math.ceil(total / perPage),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            console.error(`Error in ${this.table}.paginate:`, error);
            throw error;
        }
    }
}

module.exports = BaseModel;
