import { pool } from '../config/database';
import { generateEntityId } from '../domain/gd1Identity';
import { ApiError } from '../utils/errors';

export class Gd1IssueService {
  async listIssues() {
    const res = await pool.query('SELECT * FROM issue_logs ORDER BY created_at DESC');
    return res.rows;
  }

  async createIssue(data: any, userId?: string) {
    const issueId = generateEntityId('ISS');
    const issueNo = data.issueNo || issueId;
    const tenantId = data.tenantId || 'tenant-001';

    await pool.query(
      `INSERT INTO issue_logs (
        id, tenant_id, issue_no, entity_type, entity_id, severity, status, description, reported_by, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        issueId,
        tenantId,
        issueNo,
        data.entityType,
        data.entityId,
        data.severity || 'MEDIUM',
        'OPEN',
        data.description,
        userId || 'SYSTEM',
        data.assignedTo || null,
      ]
    );

    return this.getIssue(issueId);
  }

  async getIssue(issueId: string): Promise<any> {
    const res = await pool.query('SELECT * FROM issue_logs WHERE id = $1 OR issue_no = $1', [issueId]);
    if (res.rows.length === 0) {
      throw new ApiError(404, 'Không tìm thấy Issue.');
    }
    return res.rows[0];
  }

  async resolveIssue(issueId: string, resolutionNote: string, userId?: string) {
    const issue = await this.getIssue(issueId);
    
    await pool.query(
      `UPDATE issue_logs
       SET status = 'RESOLVED', resolution_note = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [resolutionNote, issue.id]
    );

    return this.getIssue(issue.id);
  }
}

export const gd1IssueService = new Gd1IssueService();
