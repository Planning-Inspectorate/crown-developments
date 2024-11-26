# Stage 1/2 - Builder
FROM node:22-alpine AS base

#RUN apk update

ARG GIT_SHA

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

COPY packages ./packages
COPY apps/portal ./apps/portal

RUN npm ci --loglevel notice --workspace=crowndev-portal

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

RUN npm run build --workspace=crowndev-portal

# --------------------------------

# Stage 2/2 - App run
FROM node:22-alpine

ARG GIT_SHA

WORKDIR /usr/src/app

COPY --from=base /usr/src/app ./

WORKDIR /usr/src/app/apps/portal

ENV NODE_ENV=production
ENV GIT_SHA=$GIT_SHA

# TODO: Perhaps use `RUN npm ci --production` to shrink the size of the container

EXPOSE 8080

ENTRYPOINT npm run start --workspace=crowndev-portal
