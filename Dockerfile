FROM node:24.12.0-alpine

ARG TARGETPLATFORM
ENV WAITDEPS_VERSION=0.0.1

RUN set -o pipefail \
  && ARCH=$(echo ${TARGETPLATFORM} | cut -d '/' -f 2) \
  && apk update --no-cache \
  && apk add --no-cache wget openssl \
  && wget -nv -O - https://github.com/fcanela/waitdeps/releases/download/$WAITDEPS_VERSION/waitdeps-$WAITDEPS_VERSION-linux-$ARCH.tar.gz | tar xzf - -C /usr/local/bin \
  && apk del wget

RUN corepack enable \
  && corepack prepare yarn@4.7.0 --activate

USER node
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock .yarnrc.yml ./
RUN yarn install && yarn cache clean

COPY --chown=node . .

RUN yarn build

ENTRYPOINT ["/bin/sh", "bin/start.sh"]
CMD ["yarn", "bot:run"]