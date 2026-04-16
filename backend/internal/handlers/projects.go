package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/amanjain/taskflow/internal/middleware"
	"github.com/amanjain/taskflow/internal/repository"
)

type ProjectHandler struct {
	projects *repository.ProjectRepo
	tasks    *repository.TaskRepo
}

func NewProjectHandler(projects *repository.ProjectRepo, tasks *repository.TaskRepo) *ProjectHandler {
	return &ProjectHandler{projects: projects, tasks: tasks}
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	projects, err := h.projects.ListByUser(r.Context(), userID)
	if err != nil {
		slog.Error("list projects", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	fields := map[string]string{}
	if req.Name == "" {
		fields["name"] = "is required"
	}
	if len(fields) > 0 {
		writeValidationError(w, fields)
		return
	}

	project, err := h.projects.Create(r.Context(), req.Name, req.Description, userID)
	if err != nil {
		slog.Error("create project", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.projects.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	canAccess, err := h.projects.IsUserParticipant(r.Context(), id, userID)
	if err != nil {
		slog.Error("check project access", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if !canAccess {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	tasks, err := h.tasks.ListByProject(r.Context(), id, "", "")
	if err != nil {
		slog.Error("list tasks for project", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	project.Tasks = tasks

	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.projects.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if project.OwnerID != userID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		req.Name = project.Name
	}

	updated, err := h.projects.Update(r.Context(), id, req.Name, req.Description)
	if err != nil {
		slog.Error("update project", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	project, err := h.projects.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if project.OwnerID != userID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	if err := h.projects.Delete(r.Context(), id); err != nil {
		slog.Error("delete project", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ProjectHandler) Stats(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	_, err = h.projects.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	canAccess, err := h.projects.IsUserParticipant(r.Context(), id, userID)
	if err != nil {
		slog.Error("check project access", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if !canAccess {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	stats, err := h.projects.GetStats(r.Context(), id)
	if err != nil {
		slog.Error("get stats", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
