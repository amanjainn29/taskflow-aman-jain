-- Seed data for TaskFlow
-- Password for all users: password123 (bcrypt cost 12)

INSERT INTO users (id, name, email, password, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Aman Jain',
   'test@example.com',
   '$2a$12$vZUWkE3rQhUyLlJJn5yg4eNOQDMdolShaD2xwRzM6zNvwq2A48Oii',
   NOW()),
  ('22222222-2222-2222-2222-222222222222',
   'Alice Dev',
   'alice@example.com',
   '$2a$12$vZUWkE3rQhUyLlJJn5yg4eNOQDMdolShaD2xwRzM6zNvwq2A48Oii',
   NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO projects (id, name, description, owner_id, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Greening India Platform',
   'A platform to track environmental initiatives across India',
   '11111111-1111-1111-1111-111111111111',
   NOW())
ON CONFLICT DO NOTHING;

INSERT INTO tasks (id, title, description, status, priority, project_id, creator_id, assignee_id, due_date, created_at, updated_at) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Set up CI/CD pipeline',
   'Configure GitHub Actions for automated testing and deployment',
   'done',
   'high',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   NOW() + INTERVAL '7 days',
   NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Design database schema',
   'Create ERD and write migration files for all entities',
   'in_progress',
   'high',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   NOW() + INTERVAL '3 days',
   NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Write API documentation',
   'Document all REST endpoints with request and response examples',
   'todo',
   'medium',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   NULL,
   NOW() + INTERVAL '14 days',
   NOW(), NOW())
ON CONFLICT DO NOTHING;
