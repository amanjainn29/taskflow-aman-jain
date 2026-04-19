package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestAuthMiddlewareRejectsMissingToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/projects", nil)
	rec := httptest.NewRecorder()

	handler := Auth("secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be reached without a token")
	}))

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] != "unauthorized" {
		t.Fatalf("expected unauthorized body, got %#v", body)
	}
}

func TestAuthMiddlewarePassesValidToken(t *testing.T) {
	userID := uuid.New()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID.String(),
		"email":   "test@example.com",
	})

	signed, err := token.SignedString([]byte("secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/projects", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	rec := httptest.NewRecorder()

	handler := Auth("secret")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID := GetUserID(r.Context())
		if gotUserID != userID {
			t.Fatalf("expected user id %s, got %s", userID, gotUserID)
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}
