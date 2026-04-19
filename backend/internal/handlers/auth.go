package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/amanjain/taskflow/internal/repository"
)

type AuthHandler struct {
	users     *repository.UserRepo
	jwtSecret string
}

func NewAuthHandler(users *repository.UserRepo, jwtSecret string) *AuthHandler {
	return &AuthHandler{users: users, jwtSecret: jwtSecret}
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  userPayload `json:"user"`
}

type userPayload struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r.Body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Name = normalizeRequiredText(req.Name)
	req.Email = normalizeEmail(req.Email)

	fields := map[string]string{}
	if req.Name == "" {
		fields["name"] = "is required"
	}
	if req.Email == "" {
		fields["email"] = "is required"
	} else if err := validateEmail(req.Email); err != nil {
		fields["email"] = err.Error()
	}
	if len(req.Password) < 8 {
		fields["password"] = "must be at least 8 characters"
	}
	if len(fields) > 0 {
		writeValidationError(w, fields)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		slog.Error("bcrypt error", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	user, err := h.users.Create(r.Context(), req.Name, req.Email, string(hashed))
	if err != nil {
		slog.Error("create user error", "error", err)
		writeError(w, http.StatusConflict, "email already in use")
		return
	}

	token, err := h.generateToken(user.ID.String(), user.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{
		Token: token,
		User:  userPayload{ID: user.ID.String(), Name: user.Name, Email: user.Email},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r.Body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = normalizeEmail(req.Email)

	fields := map[string]string{}
	if req.Email == "" {
		fields["email"] = "is required"
	}
	if req.Password == "" {
		fields["password"] = "is required"
	}
	if len(fields) > 0 {
		writeValidationError(w, fields)
		return
	}

	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	token, err := h.generateToken(user.ID.String(), user.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Token: token,
		User:  userPayload{ID: user.ID.String(), Name: user.Name, Email: user.Email},
	})
}

func (h *AuthHandler) generateToken(userID, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
