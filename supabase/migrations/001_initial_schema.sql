-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE event_type_enum AS ENUM ('technical', 'non_technical', 'workshop', 'outreach');
CREATE TYPE event_status_enum AS ENUM ('proposed', 'senior_core_pending', 'treasurer_pending', 'counsellor_pending', 'approved', 'closed');
CREATE TYPE approval_type_enum AS ENUM ('senior_core', 'treasurer', 'counsellor');
CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE team_type_enum AS ENUM ('documentation', 'pr', 'design', 'coverage');
CREATE TYPE document_type_enum AS ENUM ('final_document', 'design_file');
CREATE TYPE chapter_document_type_enum AS ENUM ('minutes', 'weekly_report');
CREATE TYPE review_status_enum AS ENUM ('pending', 'approved');

-- Chapters table
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_type event_type_enum NOT NULL,
    proposed_date DATE NOT NULL,
    proposed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE RESTRICT,
    status event_status_enum NOT NULL DEFAULT 'proposed',
    approved_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event approvals table
CREATE TABLE event_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approval_type approval_type_enum NOT NULL,
    status approval_status_enum NOT NULL DEFAULT 'pending',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, approver_id, approval_type)
);

-- Event assignments table
CREATE TABLE event_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_type team_type_enum NOT NULL,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, team_type)
);

-- Event documents table
CREATE TABLE event_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    document_type document_type_enum NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_status review_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proctor mappings table
CREATE TABLE proctor_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    execom_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proctor_id, execom_id)
);

-- Proctor updates table
CREATE TABLE proctor_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    execom_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    update_text TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapter documents table
CREATE TABLE chapter_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    document_type chapter_document_type_enum NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar blocks table (denormalized for performance)
CREATE TABLE calendar_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date DATE UNIQUE NOT NULL,
    event_count INTEGER DEFAULT 0,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_chapter_id ON users(chapter_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_events_chapter_id ON events(chapter_id);
CREATE INDEX idx_events_proposed_by ON events(proposed_by);
CREATE INDEX idx_events_proposed_date ON events(proposed_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_approvals_event_id ON event_approvals(event_id);
CREATE INDEX idx_event_approvals_approver_id ON event_approvals(approver_id);
CREATE INDEX idx_event_approvals_status ON event_approvals(status);
CREATE INDEX idx_event_assignments_event_id ON event_assignments(event_id);
CREATE INDEX idx_event_assignments_assigned_to ON event_assignments(assigned_to);
CREATE INDEX idx_event_documents_event_id ON event_documents(event_id);
CREATE INDEX idx_event_documents_review_status ON event_documents(review_status);
CREATE INDEX idx_proctor_mappings_proctor_id ON proctor_mappings(proctor_id);
CREATE INDEX idx_proctor_mappings_execom_id ON proctor_mappings(execom_id);
CREATE INDEX idx_proctor_updates_proctor_id ON proctor_updates(proctor_id);
CREATE INDEX idx_proctor_updates_execom_id ON proctor_updates(execom_id);
CREATE INDEX idx_chapter_documents_chapter_id ON chapter_documents(chapter_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_calendar_blocks_event_date ON calendar_blocks(event_date);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_approvals_updated_at BEFORE UPDATE ON event_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_assignments_updated_at BEFORE UPDATE ON event_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_documents_updated_at BEFORE UPDATE ON event_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proctor_mappings_updated_at BEFORE UPDATE ON proctor_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proctor_updates_updated_at BEFORE UPDATE ON proctor_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chapter_documents_updated_at BEFORE UPDATE ON chapter_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_blocks_updated_at BEFORE UPDATE ON calendar_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
