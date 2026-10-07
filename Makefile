# Atajos de desarrollo. Ejecutar desde la raíz del repositorio.
.PHONY: install install-frontend install-backend dev-frontend dev-backend lint test check

install: install-frontend install-backend

install-frontend:
	cd frontend && npm ci

install-backend:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

lint:
	cd frontend && npm run lint && npm run typecheck
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .

test:
	cd frontend && npm test
	cd backend && .venv/bin/pytest -q

check: lint test
