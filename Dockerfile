FROM node:20.12.1-alpine

ENV WAITDEPS_VERSION 0.0.1

RUN apk update --no-cache \
  && apk add --no-cache wget openssl \
  && wget -nv -O - https://github.com/fcanela/waitdeps/releases/download/$WAITDEPS_VERSION/waitdeps-$WAITDEPS_VERSION-linux-amd64.tar.gz | tar xzf - -C /usr/local/bin \
  && apk del wget

USER node
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock ./
RUN yarn && yarn cache clean

COPY --chown=node . .

RUN yarn build

ENTRYPOINT ["/bin/sh", "bin/start.sh"]
CMD ["yarn", "bot:run"]