package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/amanjain/taskflow/internal/config"
	"github.com/amanjain/taskflow/internal/database"
	"github.com/amanjain/taskflow/internal/handlers"
	"github.com/amanjain/taskflow/internal/middleware"
	"github.com/amanjain/taskflow/internal/repository"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := database.Migrate(cfg.DatabaseURL); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	// Repositories
	userRepo := repository.NewUserRepo(db)
	projectRepo := repository.NewProjectRepo(db)
	taskRepo := repository.NewTaskRepo(db)

	// Handlers
	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
	projectHandler := handlers.NewProjectHandler(projectRepo, taskRepo)
	taskHandler := handlers.NewTaskHandler(taskRepo, projectRepo, userRepo)

	// Router
	r := chi.NewRouter()
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth routes (public)
	r.Post("/auth/register", authHandler.Register)
	r.Post("/auth/login", authHandler.Login)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(cfg.JWTSecret))

		// Projects
		r.Get("/projects", projectHandler.List)
		r.Post("/projects", projectHandler.Create)
		r.Get("/projects/{id}", projectHandler.Get)
		r.Patch("/projects/{id}", projectHandler.Update)
		r.Delete("/projects/{id}", projectHandler.Delete)
		r.Get("/projects/{id}/stats", projectHandler.Stats)

		// Tasks
		r.Get("/projects/{id}/tasks", taskHandler.ListByProject)
		r.Post("/projects/{id}/tasks", taskHandler.Create)
		r.Patch("/tasks/{id}", taskHandler.Update)
		r.Delete("/tasks/{id}", taskHandler.Delete)
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	slog.Info("shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("forced shutdown", "error", err)
	}
	slog.Info("server stopped")
}
