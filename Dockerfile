FROM node:20.12.1-alpine

ARG ETHERSCAN_API_KEY
ENV ETHERSCAN_API_KEY $ETHERSCAN_API_KEY

USER node

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock ./
RUN yarn && yarn cache clean

COPY --chown=node tsconfig.json wagmi.config.ts ./
RUN yarn wagmi:generate

COPY --chown=node . .

RUN yarn build

ENTRYPOINT ["/bin/sh", "bin/start.sh"]
CMD ["yarn", "bot:run"]
