-- 001_initial_schema.sql
-- Core tables: users, refresh_tokens, profiles, books, club_books, ratings, reviews.

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE review_status AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');
CREATE TYPE poll_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE poll_type AS ENUM ('BOOK_BALLOT', 'MONTHLY_POLL', 'GENERAL');
CREATE TYPE suggestion_type AS ENUM ('BOOK', 'VENUE', 'ACTIVITY', 'THEME', 'OTHER');
CREATE TYPE suggestion_status AS ENUM ('NEW', 'REVIEWED', 'ACCEPTED', 'DECLINED');
CREATE TYPE giveaway_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE announcement_type AS ENUM ('GENERAL', 'EVENT', 'BOOK', 'PAYMENT', 'URGENT');
CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');
CREATE TYPE rsvp_status AS ENUM ('ATTENDING', 'MAYBE', 'DECLINED', 'WAITLIST');
CREATE TYPE payment_type AS ENUM ('EVENT', 'CONTRIBUTION', 'MERCHANDISE', 'MEMBERSHIP', 'DONATION');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE profile_visibility AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'MEMBER',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  region TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens (opaque, hashed server-side)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Email verification + password reset tokens
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'verify_email' | 'reset_password'
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);

-- Profiles
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favourite_book TEXT,
  favourite_genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_visibility profile_visibility NOT NULL DEFAULT 'MEMBERS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Books (authoritative snapshot imported from external provider)
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_provider TEXT,
  external_id TEXT,
  isbn TEXT,
  isbn_13 TEXT,
  isbn_10 TEXT,
  title TEXT NOT NULL,
  author TEXT,
  subtitle TEXT,
  description TEXT,
  cover_url TEXT,
  publisher TEXT,
  published_date TEXT,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_books_external ON books(external_provider, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn13 ON books(isbn_13) WHERE isbn_13 IS NOT NULL;

-- Club reads (authoritative assignment of a book to a reading period)
CREATE TABLE club_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  selected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PAST', -- 'CURRENT' | 'PAST' | 'UPCOMING'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_books_status ON club_books(status);
CREATE INDEX idx_club_books_dates ON club_books(start_date, end_date);
CREATE UNIQUE INDEX idx_club_books_current ON club_books(status) WHERE status = 'CURRENT';

-- Ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ratings_unique ON ratings(book_id, user_id);
CREATE INDEX idx_ratings_book ON ratings(book_id);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE,
  status review_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_book ON reviews(book_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
