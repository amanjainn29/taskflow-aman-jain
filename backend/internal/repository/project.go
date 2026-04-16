package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/amanjain/taskflow/internal/models"
)

type ProjectRepo struct {
	db *pgxpool.Pool
}

func NewProjectRepo(db *pgxpool.Pool) *ProjectRepo {
	return &ProjectRepo{db: db}
}

func (r *ProjectRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.Project, error) {
	rows, err := r.db.Query(ctx,
		`SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at
		 FROM projects p
		 LEFT JOIN tasks t ON t.project_id = p.id
		 WHERE p.owner_id = $1 OR t.assignee_id = $1
		 ORDER BY p.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []models.Project{}
	}
	return projects, nil
}

func (r *ProjectRepo) Create(ctx context.Context, name string, description *string, ownerID uuid.UUID) (*models.Project, error) {
	p := &models.Project{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO projects (id, name, description, owner_id, created_at)
		 VALUES (gen_random_uuid(), $1, $2, $3, NOW())
		 RETURNING id, name, description, owner_id, created_at`,
		name, description, ownerID,
	).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create project: %w", err)
	}
	return p, nil
}

func (r *ProjectRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	p := &models.Project{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, description, owner_id, created_at FROM projects WHERE id = $1`,
		id,
	).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get project: %w", err)
	}
	return p, nil
}

func (r *ProjectRepo) IsUserParticipant(ctx context.Context, projectID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM projects p
			LEFT JOIN tasks t ON t.project_id = p.id
			WHERE p.id = $1
			  AND (p.owner_id = $2 OR t.assignee_id = $2)
		)`,
		projectID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check project participant: %w", err)
	}
	return exists, nil
}

func (r *ProjectRepo) Update(ctx context.Context, id uuid.UUID, name string, description *string) (*models.Project, error) {
	p := &models.Project{}
	err := r.db.QueryRow(ctx,
		`UPDATE projects SET name = $2, description = $3 WHERE id = $1
		 RETURNING id, name, description, owner_id, created_at`,
		id, name, description,
	).Scan(&p.ID, &p.Name, &p.Description, &p.OwnerID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("update project: %w", err)
	}
	return p, nil
}

func (r *ProjectRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}

func (r *ProjectRepo) GetStats(ctx context.Context, projectID uuid.UUID) (*models.ProjectStats, error) {
	stats := &models.ProjectStats{
		ByStatus:   make(map[string]int),
		ByAssignee: make(map[string]int),
	}

	rows, err := r.db.Query(ctx,
		`SELECT status, COUNT(*) FROM tasks WHERE project_id = $1 GROUP BY status`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var count int
		rows.Scan(&status, &count)
		stats.ByStatus[status] = count
		stats.TotalTasks += count
	}

	arows, err := r.db.Query(ctx,
		`SELECT COALESCE(assignee_id::text, 'unassigned'), COUNT(*)
		 FROM tasks WHERE project_id = $1 GROUP BY assignee_id`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer arows.Close()
	for arows.Next() {
		var assignee string
		var count int
		arows.Scan(&assignee, &count)
		stats.ByAssignee[assignee] = count
	}

	return stats, nil
}
