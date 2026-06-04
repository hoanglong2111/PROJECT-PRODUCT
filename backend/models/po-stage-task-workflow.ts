import { pool } from '../config/database';

export async function listPoStageTasks() {
  const result = await pool.query('SELECT * FROM po_stage_tasks ORDER BY due_date ASC');
  return result.rows;
}

export async function updatePoStageTask(input: {
  note: unknown;
  status: string;
  taskId: string;
  userEmail: string;
}) {
  let query = `
    UPDATE po_stage_tasks
    SET status = $1, note = COALESCE($2, note), updated_at = NOW()
  `;
  const params: unknown[] = [input.status, input.note, input.taskId];

  if (input.status === 'DONE') {
    query += ', completed_at = NOW(), completed_by = $4';
    params.push(input.userEmail);
  } else if (input.status === 'IN_PROGRESS') {
    query += ', started_at = NOW()';
  }

  query += ' WHERE id = $3';
  const result = await pool.query(query, params);
  return result.rowCount !== 0;
}
