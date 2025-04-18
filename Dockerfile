FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache perl python3 ruby bash
RUN npm install --no-cache serve-static finalhandler cgi-core

COPY ./server/ ./server/

VOLUME ["/usr/src/app/htdocs"]
VOLUME ["/usr/src/app/cgi-bin"]

EXPOSE 3001

CMD ["node", "server/docker.mjs"]

# HOWTO
#
# 1-build your image:
#
# docker build -t cgi-server .
#
# 2-then, run a container:
#
# docker run -e PORT=3001 -p 3001:3001 -v ./cgi-bin:/usr/src/app/cgi-bin -v ./htdocs:/usr/src/app/htdocs cgi-server
#
#
# (You may need to adjust permissions for the directories and scripts in the cgi-bin folder to ensure they can be executed.)
