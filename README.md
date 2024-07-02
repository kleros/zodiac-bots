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

## Configuration

This section outlines the environment variables required for the application. Below are the variables, their descriptions, examples, and default values.

### Required Environment Variables

| Variable          | Description                               | Example                                                         |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `SPACES`          | Spaces to monitor. At least one required. | `kleros.eth:3000000,1inch.eth:6000000`                          |
| `DB_URI`          | Postgres connection string                | `postgresql://user:password@localhost:5432/dbname`              |
| `MAINNET_RPC_URL` | Provider URL for the Ethereum mainnet RPC | `https://mainnet.infura.io/v3/8238211010344719ad14a89db874158c` |

- **SPACES format**: Comma separated list of spaces to follow. The spaces are defined by the ENS, starting block and (optionally) the Reality module contract address. These three values should be colon separated following the format `ens:block<:reality module address>`. When the reality module address is not provided, the bot tries to auto-detect it. Examples:
  - `1inch.eth:19475120`: Defines space `1inch.eth` starting at block `19475120`.
  - `shutterdao0x36.eth:20190728:0x6eaB9b5c4Be8F66fC8efb0FdF256FC9143344885`: Defines space `shutterdao0x36.eth` starting at block `20190728` with the Reality module contract address set to `0x6eaB9b5c4Be8F66fC8efb0FdF256FC9143344885`.

### Optional Environment Variables

#### Debugging and Performance

| Variable                | Description                                            | Example                            | Default                            |
| ----------------------- | ------------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| `DB_DEBUG`              | Print SQL queries to console                           | `true`                             | `false`                            |
| `MAX_BLOCKS_BATCH_SIZE` | Max blocks to process in a batch                       | `3000`                             | `200`                              |
| `BATCH_COOLDOWN`        | Wait time in milliseconds before processing next batch | `60000`                            | `200`                              |
| `SNAPSHOT_GRAPHQL_URL`  | Snapshot GraphQL API endpoint                          | `https://hub.snapshot.org/graphql` | `https://hub.snapshot.org/graphql` |

#### Heartbeats

Heartbeats are periodic GET requests performed against an endpoint to indicate that the service is alive.

| Variable             | Description                               | Example                                         | Default |
| -------------------- | ----------------------------------------- | ----------------------------------------------- | ------- |
| `HEARTBEAT_URL`      | URL that will receive the GET request     | `https://instrumentation.keros.io/hooks/zodiac` |         |
| `HEARTBEAT_INTERVAL` | Interval in milliseconds between requests | `1000`                                          | `60000` |

### Transports Configuration

For the bot being functional you should enable at least one transport, but all of them are optional and can be combined as desired. Transports are enabled when all the environment variables without default fallback are present with a valid value.

#### Slack Transport

| Variable        | Description       | Example                                                                        | Default |
| --------------- | ----------------- | ------------------------------------------------------------------------------ | ------- |
| `SLACK_WEBHOOK` | Slack Webhook URL | `https://hook.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX` |         |

More information about how to obtain a Webhook URL can be found in the [Slack documentation](https://api.slack.com/messaging/webhooks).

#### Telegram Transport

| Variable           | Description            | Example                                         | Default |
| ------------------ | ---------------------- | ----------------------------------------------- | ------- |
| `TELEGRAM_TOKEN`   | Telegram API Token     | `4839574812:AAFD39kkdpWt3ywyRZergyOLMaJhac60qc` |         |
| `TELEGRAM_CHAT_ID` | Identifier of the chat | `-1002037333689`                                |         |

The [Telegram docs](https://core.telegram.org/bots#how-do-i-create-a-bot-token) explains how to obtain a token. For the ChatID there are several strategies, some can be found in [this gist and its comment section](https://gist.github.com/mraaroncruz/e76d19f7d61d59419002db54030ebe35).

#### Email Transport

| Variable        | Description                       | Example                 | Default |
| --------------- | --------------------------------- | ----------------------- | ------- |
| `SMTP_HOST`     | Hostname or IP of the SMTP server | `smtp.server.com`       |         |
| `SMTP_PORT`     | Port for SMTP server              | `465`                   | `465`   |
| `SMTP_USER`     | Username                          | `kleros`                |         |
| `SMTP_PASSWORD` | Password                          | `kleros`                |         |
| `SMTP_FROM`     | Sender email address              | `no-reply@kleros.local` |         |
| `SMTP_TO`       | Recipient email address           | `alert@kleros.local`    |         |

`SMTP_TO` allows multiples entries separated by commas. Entries can be defined using one of the following formats:

- Simple emails (`alerts@example.com`), which will receive notifications for all the spaces.
- Space-scoped emails (`kleros.eth:alerts@example.com`), which will receive only notifications for the provided space (in the example above, `kleros.eth`).
