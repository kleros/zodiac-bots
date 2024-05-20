# Zodiac bots

> Provides notifications for Zodiac proposals and votes.

## Installation

1. Clone the repository
2. Copy the `.env.example` file to `.env` and fill in the details.
3. Fill the appropriate instructions for your installation method.

### Using docker-compose

Requirements:

- Docker 26
- Docker Compose 2.23

Execute `docker compose up bot`. If you do not have a database instance, running `docker compose up bot-dev` instead will start the bot with an ephemeral one.

### Run locally without supervisor

Requirements:

- Node 20
- Yarn 4

1. Ensure that you have loaded the environment variables in your `.env` file.
2. Install the dependencies executing `yarn`.
3. Perform a `yarn wagmi:generate` to retrieve the ABIs.
4. Execute `yarn build`.
5. Run `bin/start.sh yarn bot:run`.

## Development

The `.env.example` file contains a configuration that makes the dev services defined in `docker compose` work out of the box. Only tokens/keys are omitted.

Useful services (and how to start them) with `docker compose`:

- `docker compose up bot`: Starts the bot without any dependency. You are responsible for starting them manually.
- `docker compose up bot-dev`: Starts the bot with a PostgreSQL database and HardHat instance.
- `docker compose up tests`: Starts the dependencies and runs the test suite, showing a coverage report at the end.

Useful command for local execution:

- `yarn build`:
- `yarn bot:run`: Executes the bot.
- `yarn test`: Executes the tests.
- `yarn wagmi:generate`: Downloads the ABIs, required for running the bot and tests.
- `yarn drizzle:generate`: Creates a new migration using Drizzle-Kit.
- `yarn drizzle:migrate`: Ensures the database is up-to-date and applies migrations otherwise.

It is recommended to prefix `bin/start.sh` to the `yarn` tasks for bot and tests execution. The `start.sh` script ensures your environment variables are correctly configured, the dependant services are running and the migrations are applied before running whatever command is passed.
