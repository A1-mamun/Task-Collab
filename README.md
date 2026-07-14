# Install dependencies

```bash
pnpm install
```

## Environment Setup

Create a `.env` file in the project root and copy the following values: (replace with your own values, and use your own text where needed)

```env
NODE_ENV=development
PORT=5001
DATABASE_URL=""

NODEMAILER_USER=
NODEMAILER_PASS=

BCRYPT_SALT_ROUNDS=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=

RESET_PASS_UI_LINK=

FRONTEND_URLS=
```

# Setup database

```bash
pnpm db:generate

pnpm db:migrate

pnpm db:seed
```

# Start development server

```bash
pnpm dev
```
