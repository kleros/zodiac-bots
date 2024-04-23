FROM node:20.12.1-alpine

ARG ETHERSCAN_API_KEY
ENV ETHERSCAN_API_KEY $ETHERSCAN_API_KEY

RUN env

USER node

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node . .

RUN yarn && yarn generate && yarn cache clean

CMD ["yarn", "bot:run"]

