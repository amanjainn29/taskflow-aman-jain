package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/amanjain/taskflow/internal/models"
)

type TaskRepo struct {
	db *pgxpool.Pool
}

func NewTaskRepo(db *pgxpool.Pool) *TaskRepo {
	return &TaskRepo{db: db}
}

func (r *TaskRepo) ListByProject(ctx context.Context, projectID uuid.UUID, status, assignee string) ([]models.Task, error) {
	query := `SELECT id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at
	          FROM tasks WHERE project_id = $1`
	args := []any{projectID}
	argIdx := 2

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if assignee != "" {
		aid, err := uuid.Parse(assignee)
		if err == nil {
			query += fmt.Sprintf(" AND assignee_id = $%d", argIdx)
			args = append(args, aid)
		}
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.ProjectID, &t.CreatorID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}
	if tasks == nil {
		tasks = []models.Task{}
	}
	return tasks, nil
}

func (r *TaskRepo) Create(ctx context.Context, projectID, creatorID uuid.UUID, title string, description *string,
	priority models.TaskPriority, assigneeID *uuid.UUID, dueDate *string) (*models.Task, error) {
	t := &models.Task{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO tasks (id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at)
		 VALUES (gen_random_uuid(), $1, $2, 'todo', $3, $4, $5, $6, $7, NOW(), NOW())
		 RETURNING id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at`,
		title, description, priority, projectID, creatorID, assigneeID, dueDate,
	).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.CreatorID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return t, nil
}

func (r *TaskRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	t := &models.Task{}
	err := r.db.QueryRow(ctx,
		`SELECT id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at
		 FROM tasks WHERE id = $1`, id,
	).Scan(&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.CreatorID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	return t, nil
}

type UpdateTaskInput struct {
	Title            *string
	Description      *string
	Status           *models.TaskStatus
	Priority         *models.TaskPriority
	AssigneeID       *uuid.UUID
	DueDate          *string
	ClearDescription bool
	ClearAssignee    bool
	ClearDueDate     bool
}

func (r *TaskRepo) Update(ctx context.Context, id uuid.UUID, input UpdateTaskInput) (*models.Task, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argIdx := 1

	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argIdx))
		args = append(args, *input.Title)
		argIdx++
	}
	if input.ClearDescription {
		setClauses = append(setClauses, "description = NULL")
	} else if input.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argIdx))
		args = append(args, *input.Description)
		argIdx++
	}
	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *input.Status)
		argIdx++
	}
	if input.Priority != nil {
		setClauses = append(setClauses, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *input.Priority)
		argIdx++
	}
	if input.ClearAssignee {
		setClauses = append(setClauses, "assignee_id = NULL")
	} else if input.AssigneeID != nil {
		setClauses = append(setClauses, fmt.Sprintf("assignee_id = $%d", argIdx))
		args = append(args, *input.AssigneeID)
		argIdx++
	}
	if input.ClearDueDate {
		setClauses = append(setClauses, "due_date = NULL")
	} else if input.DueDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("due_date = $%d", argIdx))
		args = append(args, *input.DueDate)
		argIdx++
	}

	args = append(args, id)
	query := fmt.Sprintf(
		`UPDATE tasks SET %s WHERE id = $%d
		 RETURNING id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at`,
		strings.Join(setClauses, ", "), argIdx,
	)

	t := &models.Task{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.ProjectID, &t.CreatorID, &t.AssigneeID, &t.DueDate, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}
	return t, nil
}

func (r *TaskRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tasks WHERE id = $1`, id)
	return err
}
