FROM node:20

WORKDIR /usr/src/app

COPY ./cgi-core.js ./
COPY ./lib/ ./lib/
COPY ./server/ ./server/

VOLUME ["/usr/src/app/cgi-bin"]

EXPOSE 3001

CMD ["node", "server/http.mjs"]
