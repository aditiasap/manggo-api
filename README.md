# MangGo API

API GW for MangGo App (using ExpressJs).


## Installation

Make sure git and node version > 20 is installed and running

```bash
git clone https://github.com/aditiasap/manggo-api.git
cd manggo-api
npm install
```


## Setup Environment

create .env file in the root project, and fill in as below:

```bash
PORT=37119
DBURL="file:./manggo.db"
POLLINATIONS_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Register and login into Pollinations AI and Cloudinary, then get all required secret info above within their dashboard. Create the key if none.


## Deploy DB SQLite Schema

```bash
npx prisma generate
npx prisma migrate deploy
```

## Run in dev mode

```bash
npm run dev
```

The local API GW should be accessible at http://localhost:37119/manggo/api
