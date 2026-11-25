/**
 * In-memory fake for the `config/database` module used by unit tests.
 *
 * This helper never opens a socket. It implements only the small surface the
 * router logic uses (`execute`, `query`) and records every call so tests can
 * assert that no unexpected writes were attempted.
 */

function createMockDb(initialTables = {}) {
    const tables = new Map();
    for (const [name, rows] of Object.entries(initialTables)) {
        tables.set(name, rows.map(row => ({ ...row })));
    }

    const calls = [];

    function parse(sql) {
        const match = String(sql).trim().match(/^(SELECT|INSERT|UPDATE|DELETE|REPLACE)\s+([\s\S]+)$/i);
        return { verb: match ? match[1].toUpperCase() : 'OTHER', body: match ? match[2] : String(sql) };
    }

    function tableOf(body) {
        const m = body.match(/\b(?:FROM|INTO|UPDATE)\s+`?([a-zA-Z0-9_]+)`?/i);
        return m ? m[1] : null;
    }

    const db = {
        calls,
        tables,

        async execute(sql, params = []) {
            calls.push({ sql: String(sql), params: [...params] });
            const { verb, body } = parse(sql);
            if (verb === 'SELECT') {
                const rows = tables.get(tableOf(body)) || [];
                // Support the handful of two-column equality predicates used by
                // the router logic. Each WHERE term is joined by AND/OR and
                // compared against the corresponding positional parameter.
                const whereMatch = body.match(/\bWHERE\s+([\s\S]+?)(?:\s+LIMIT|\s+ORDER\s+BY|$)/i);
                let result = rows;
                if (whereMatch) {
                    const terms = whereMatch[1].split(/\s+OR\s+|\s+AND\s+/i);
                    const normalizedSerial = whereMatch[1].includes('serial_number') &&
                        whereMatch[1].includes('REPLACE(');
                    result = rows.filter(row => terms.some((term, i) => {
                        if (normalizedSerial) {
                            const value = String(row.serial_number || '')
                                .toUpperCase().replace(/[ :.\/]/g, '');
                            return value === String(params[i]);
                        }
                        const colMatch = term.trim().match(/^`?([a-zA-Z0-9_]+)`?\s*=\s*\?$/);
                        if (!colMatch) return true; // unsupported predicate: do not filter
                        return String(row[colMatch[1]]) === String(params[i]);
                    }));
                }
                const limitMatch = body.match(/\bLIMIT\s+(\d+)/i);
                if (limitMatch) result = result.slice(0, parseInt(limitMatch[1], 10));
                return [result, []];
            }
            // Writes are recorded but not applied: tests must use fixtures.
            return [{ affectedRows: 0, insertId: 0 }, []];
        },

        async query(sql, params = []) {
            return db.execute(sql, params);
        }
    };

    return db;
}

/** Assert that a mock DB received no write statements. */
function assertReadOnly(db) {
    const writes = db.calls.filter(c => /^\s*(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|TRUNCATE)\b/i.test(c.sql));
    if (writes.length) {
        throw new Error(`Unexpected write statement(s) in test: ${writes.map(w => w.sql).join(' | ')}`);
    }
}

module.exports = { createMockDb, assertReadOnly };
