package handlers

import (
	"strings"
	"testing"
)

func TestOptionalStringUnmarshal(t *testing.T) {
	t.Run("string value", func(t *testing.T) {
		var field OptionalString
		if err := field.UnmarshalJSON([]byte(`" hello "`)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if !field.Set || field.Null {
			t.Fatalf("expected field to be set with a non-null value")
		}
		if got := field.Trimmed(); got != "hello" {
			t.Fatalf("expected trimmed value to be hello, got %q", got)
		}
	})

	t.Run("null value", func(t *testing.T) {
		var field OptionalString
		if err := field.UnmarshalJSON([]byte("null")); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if !field.Set || !field.Null {
			t.Fatalf("expected field to be set as null")
		}
		if field.NullableText() != nil {
			t.Fatalf("expected null field to return nil text")
		}
	})
}

func TestDecodeJSON(t *testing.T) {
	t.Run("rejects unknown fields", func(t *testing.T) {
		var req struct {
			Name string `json:"name"`
		}

		err := decodeJSON(strings.NewReader(`{"name":"TaskFlow","extra":true}`), &req)
		if err == nil {
			t.Fatal("expected unknown field error")
		}
	})

	t.Run("rejects multiple JSON objects", func(t *testing.T) {
		var req struct {
			Name string `json:"name"`
		}

		err := decodeJSON(strings.NewReader(`{"name":"TaskFlow"}{"again":true}`), &req)
		if err == nil {
			t.Fatal("expected multiple object error")
		}
	})
}

func TestValidateISODate(t *testing.T) {
	if err := validateISODate("2026-04-30"); err != nil {
		t.Fatalf("expected valid date, got error: %v", err)
	}

	if err := validateISODate("30-04-2026"); err == nil {
		t.Fatal("expected invalid date format error")
	}
}
