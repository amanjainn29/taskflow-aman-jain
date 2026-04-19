package handlers

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/amanjain/taskflow/internal/middleware"
	"github.com/amanjain/taskflow/internal/models"
	"github.com/amanjain/taskflow/internal/repository"
)

type TaskHandler struct {
	tasks    *repository.TaskRepo
	projects *repository.ProjectRepo
	users    *repository.UserRepo
}

func NewTaskHandler(tasks *repository.TaskRepo, projects *repository.ProjectRepo, users *repository.UserRepo) *TaskHandler {
	return &TaskHandler{tasks: tasks, projects: projects, users: users}
}

func (h *TaskHandler) ListByProject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	_, err = h.projects.GetByID(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	canAccess, err := h.projects.IsUserParticipant(r.Context(), projectID, userID)
	if err != nil {
		slog.Error("check project access", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if !canAccess {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	status := r.URL.Query().Get("status")
	assignee := r.URL.Query().Get("assignee")
	if assignee != "" {
		if _, err := uuid.Parse(assignee); err != nil {
			writeError(w, http.StatusBadRequest, "invalid assignee")
			return
		}
	}

	tasks, err := h.tasks.ListByProject(r.Context(), projectID, status, assignee)
	if err != nil {
		slog.Error("list tasks", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projectID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	_, err = h.projects.GetByID(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	canAccess, err := h.projects.IsUserParticipant(r.Context(), projectID, userID)
	if err != nil {
		slog.Error("check project access", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if !canAccess {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Title       string              `json:"title"`
		Description *string             `json:"description"`
		Priority    models.TaskPriority `json:"priority"`
		AssigneeID  *string             `json:"assignee_id"`
		DueDate     *string             `json:"due_date"`
	}
	if err := decodeJSON(r.Body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Title = normalizeRequiredText(req.Title)
	req.Description = normalizeOptionalText(req.Description)
	req.DueDate = normalizeOptionalText(req.DueDate)

	fields := map[string]string{}
	if req.Title == "" {
		fields["title"] = "is required"
	}
	validPriorities := map[models.TaskPriority]bool{
		models.PriorityLow: true, models.PriorityMedium: true, models.PriorityHigh: true,
	}
	if req.Priority == "" {
		req.Priority = models.PriorityMedium
	} else if !validPriorities[req.Priority] {
		fields["priority"] = "must be low, medium, or high"
	}
	if req.DueDate != nil {
		if err := validateISODate(*req.DueDate); err != nil {
			fields["due_date"] = err.Error()
		}
	}

	var assigneeID *uuid.UUID
	if req.AssigneeID != nil && normalizeRequiredText(*req.AssigneeID) != "" {
		aid, err := uuid.Parse(normalizeRequiredText(*req.AssigneeID))
		if err != nil {
			fields["assignee_id"] = "must be a valid UUID"
		} else {
			exists, err := h.users.ExistsByID(r.Context(), aid)
			if err != nil {
				slog.Error("check assignee existence", "error", err)
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if !exists {
				fields["assignee_id"] = "must reference an existing user"
			} else {
				assigneeID = &aid
			}
		}
	}
	if len(fields) > 0 {
		writeValidationError(w, fields)
		return
	}

	task, err := h.tasks.Create(r.Context(), projectID, userID, req.Title, req.Description, req.Priority, assigneeID, req.DueDate)
	if err != nil {
		slog.Error("create task", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusCreated, task)
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	task, err := h.tasks.GetByID(r.Context(), taskID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	// Check access: project owner or task assignee
	userID := middleware.GetUserID(r.Context())
	project, err := h.projects.GetByID(r.Context(), task.ProjectID)
	if err != nil {
		slog.Error("get project for task update", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if project.OwnerID != userID {
		if task.AssigneeID == nil || *task.AssigneeID != userID {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
	}

	var req struct {
		Title       OptionalString       `json:"title"`
		Description OptionalString       `json:"description"`
		Status      *models.TaskStatus   `json:"status"`
		Priority    *models.TaskPriority `json:"priority"`
		AssigneeID  OptionalString       `json:"assignee_id"`
		DueDate     OptionalString       `json:"due_date"`
	}
	if err := decodeJSON(r.Body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	fields := map[string]string{}
	if req.Title.Set {
		title := req.Title.Trimmed()
		if req.Title.Null || title == "" {
			fields["title"] = "cannot be empty"
		}
	}
	if req.Status != nil {
		validStatuses := map[models.TaskStatus]bool{
			models.StatusTodo: true, models.StatusInProgress: true, models.StatusDone: true,
		}
		if !validStatuses[*req.Status] {
			fields["status"] = "must be todo, in_progress, or done"
		}
	}
	if req.Priority != nil {
		validPriorities := map[models.TaskPriority]bool{
			models.PriorityLow: true, models.PriorityMedium: true, models.PriorityHigh: true,
		}
		if !validPriorities[*req.Priority] {
			fields["priority"] = "must be low, medium, or high"
		}
	}
	if req.DueDate.Set && !req.DueDate.Null {
		dueDate := req.DueDate.Trimmed()
		if dueDate != "" {
			if err := validateISODate(dueDate); err != nil {
				fields["due_date"] = err.Error()
			}
		}
	}
	if req.AssigneeID.Set && !req.AssigneeID.Null {
		assignee := req.AssigneeID.Trimmed()
		if assignee != "" {
			aid, err := uuid.Parse(assignee)
			if err != nil {
				fields["assignee_id"] = "must be a valid UUID"
			} else {
				exists, err := h.users.ExistsByID(r.Context(), aid)
				if err != nil {
					slog.Error("check assignee existence", "error", err)
					writeError(w, http.StatusInternalServerError, "internal error")
					return
				}
				if !exists {
					fields["assignee_id"] = "must reference an existing user"
				}
			}
		}
	}
	if len(fields) > 0 {
		writeValidationError(w, fields)
		return
	}

	input := repository.UpdateTaskInput{
		Status:   req.Status,
		Priority: req.Priority,
	}

	if req.Title.Set && !req.Title.Null {
		title := req.Title.Trimmed()
		if title != "" {
			input.Title = &title
		}
	}
	if req.Description.Set {
		description := req.Description.Trimmed()
		if req.Description.Null || description == "" {
			input.ClearDescription = true
		} else {
			input.Description = &description
		}
	}
	if req.AssigneeID.Set {
		assignee := req.AssigneeID.Trimmed()
		if req.AssigneeID.Null || assignee == "" {
			input.ClearAssignee = true
		} else {
			aid, _ := uuid.Parse(assignee)
			input.AssigneeID = &aid
		}
	}
	if req.DueDate.Set {
		dueDate := req.DueDate.Trimmed()
		if req.DueDate.Null || dueDate == "" {
			input.ClearDueDate = true
		} else {
			input.DueDate = &dueDate
		}
	}

	updated, err := h.tasks.Update(r.Context(), taskID, input)
	if err != nil {
		slog.Error("update task", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	taskID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid task id")
		return
	}

	task, err := h.tasks.GetByID(r.Context(), taskID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	project, err := h.projects.GetByID(r.Context(), task.ProjectID)
	if err != nil {
		slog.Error("get project for task delete", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	isOwner := project.OwnerID == userID
	isCreator := task.CreatorID == userID

	if !isOwner && !isCreator {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := h.tasks.Delete(r.Context(), taskID); err != nil {
		slog.Error("delete task", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
