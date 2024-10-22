FROM node:20

WORKDIR /usr/src/app

RUN npm install --save serve-static finalhandler cgi-core

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
# docker run -p 3001:3001 -v ./cgi-bin:/usr/src/app/cgi-bin -v ./htdocs:/usr/src/app/htdocs cgi-server
