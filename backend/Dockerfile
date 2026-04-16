# ---- Build Stage ----
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# ---- Runtime Stage ----
FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata curl

COPY --from=builder /app/server /server
COPY --from=builder /app/migrations /migrations

EXPOSE 8080

ENTRYPOINT ["/server"]
