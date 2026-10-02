-- CreateTable
CREATE TABLE "ocr_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "ledger_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ocr_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ocr_sessions_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "ledgers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ocr_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "raw_response" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ocr_pages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ocr_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ocr_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "contact_name" TEXT NOT NULL DEFAULT '',
    "amount" REAL NOT NULL DEFAULT 0,
    "is_gift_item" BOOLEAN NOT NULL DEFAULT false,
    "gift_description" TEXT,
    "note" TEXT,
    "recordDate" DATETIME NOT NULL,
    "record_type" TEXT NOT NULL DEFAULT 'received',
    "needs_review" BOOLEAN NOT NULL DEFAULT true,
    "review_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ocr_rows_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "ocr_pages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ocr_sessions_user_id_idx" ON "ocr_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ocr_sessions_ledger_id_idx" ON "ocr_sessions"("ledger_id");

-- CreateIndex
CREATE INDEX "ocr_sessions_status_expires_at_idx" ON "ocr_sessions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "ocr_pages_session_id_idx" ON "ocr_pages"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_pages_session_id_page_number_key" ON "ocr_pages"("session_id", "page_number");

-- CreateIndex
CREATE INDEX "ocr_rows_page_id_idx" ON "ocr_rows"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_rows_page_id_row_index_key" ON "ocr_rows"("page_id", "row_index");
