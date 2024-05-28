FROM node:20.12.1-alpine

USER node

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock ./
RUN yarn && yarn cache clean

COPY --chown=node . .
RUN yarn build

ENTRYPOINT ["/bin/sh", "bin/start.sh"]
CMD ["yarn", "bot:run"]