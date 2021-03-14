FROM node:14

WORKDIR /marvin

ENV TZ=Etc/UTC \
    APP_USER=marvin

RUN groupadd $APP_USER \
 && useradd -g $APP_USER $APP_USER

RUN yarn config set cache-folder /marvin/.yarn-cache

COPY package.json .
COPY yarn.lock .
RUN yarn

RUN apt-get update && apt-get install -y python php ruby golang perl

ADD . ./

RUN yarn build

RUN chown -R $APP_USER:$APP_USER /marvin

USER $APP_USER

CMD ["node", "./dist/index.js"]