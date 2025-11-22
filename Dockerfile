FROM node:24-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache perl python3 ruby bash
RUN npm install --no-save cgi-core

VOLUME ["/usr/src/app/cgi-bin"]

EXPOSE 3001

CMD ["npx", "cgi-server", "--port", "3001", "--filePath", "/usr/src/app/cgi-bin", "-d", "-l"]

# HOWTO
#
# 1-build your image:
#
# docker build -t cgi-server .
#
# 2-then, run a container:
#
# docker run -e PORT=3001 -p 3001:3001 -v ./cgi-bin:/usr/src/app/cgi-bin cgi-server
#
#
# (You may need to adjust permissions for the directories and scripts in the cgi-bin folder to ensure they can be executed.)
