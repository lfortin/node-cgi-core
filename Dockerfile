FROM node:20

WORKDIR /usr/src/app

RUN npm install --save serve-static finalhandler cgi-core

COPY ./cgi-core.js ./
COPY ./lib/ ./lib/
COPY ./server/ ./server/

VOLUME ["/usr/src/app/htdocs"]
VOLUME ["/usr/src/app/cgi-bin"]

EXPOSE 3001

CMD ["node", "server/docker.mjs"]
