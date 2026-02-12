/**
 * D1 Database query helpers
 * Replaces Sequelize ORM with direct D1 prepared statements
 */

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().split('T')[0];

/**
 * Build a dynamic IN clause with placeholders
 */
export function inClause(values: (string | number)[]): { placeholders: string; bindings: (string | number)[] } {
  if (values.length === 0) return { placeholders: '(NULL)', bindings: [] };
  const placeholders = `(${values.map(() => '?').join(',')})`;
  return { placeholders, bindings: values };
}

/**
 * Build a dynamic UPDATE SET clause from an object
 */
export function buildUpdateSet(updates: Record<string, unknown>): { clause: string; bindings: unknown[] } {
  const entries = Object.entries(updates).filter(([_, v]) => v !== undefined);
  const clause = entries.map(([k]) => `${k} = ?`).join(', ');
  const bindings = entries.map(([_, v]) => v);
  return { clause: `${clause}, updatedAt = ?`, bindings: [...bindings, now()] };
}

export { now, today };
