COMPOSE_FILE=./docker-compose/docker-compose.yml
PROFILE=local

.PHONY: start stop status

start:
	@echo "Starting Freedium services..."
	docker compose --profile $(PROFILE) -f $(COMPOSE_FILE) up -d

stop:
	@echo "Stopping Freedium services..."
	docker compose --profile $(PROFILE) -f $(COMPOSE_FILE) down

status:
	@if [ -n "$(shell sudo docker compose --profile $(PROFILE) -f $(COMPOSE_FILE) ps -q 2>/dev/null)" ]; then \
		echo "up"; \
	else \
		echo "down"; \
	fi
