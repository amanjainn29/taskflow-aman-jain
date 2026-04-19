package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/mail"
	"strings"
	"time"
)

// OptionalString preserves whether a PATCH field was omitted, set to null, or set to a value.
type OptionalString struct {
	Set   bool
	Null  bool
	Value string
}

func (o *OptionalString) UnmarshalJSON(data []byte) error {
	o.Set = true
	o.Null = string(data) == "null"
	if o.Null {
		o.Value = ""
		return nil
	}
	return json.Unmarshal(data, &o.Value)
}

func (o OptionalString) Trimmed() string {
	return strings.TrimSpace(o.Value)
}

func (o OptionalString) NullableText() *string {
	if !o.Set || o.Null {
		return nil
	}

	value := strings.TrimSpace(o.Value)
	if value == "" {
		return nil
	}
	return &value
}

func decodeJSON(r io.Reader, dst any) error {
	dec := json.NewDecoder(r)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		return err
	}

	var extra struct{}
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return errors.New("request body must contain a single JSON object")
		}
		return err
	}

	return nil
}

func normalizeRequiredText(value string) string {
	return strings.TrimSpace(value)
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func validateEmail(value string) error {
	addr, err := mail.ParseAddress(value)
	if err != nil || addr.Address != value {
		return fmt.Errorf("must be a valid email address")
	}
	return nil
}

func validateISODate(value string) error {
	if _, err := time.Parse("2006-01-02", value); err != nil {
		return fmt.Errorf("must be in YYYY-MM-DD format")
	}
	return nil
}
