.PHONY: clean generate migrate

clean:
	rm -rf .wrangler/state/v3/d1 migrations

generate:
	npx drizzle-kit generate:sqlite --out migrations --schema db/schema.ts

migrate:
	npx wrangler d1 migrations apply bb_dev --local

all: clean generate migrate